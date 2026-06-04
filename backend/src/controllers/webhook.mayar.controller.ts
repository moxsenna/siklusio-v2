import { Context } from "hono";
import { type Env } from "../env";
import { getSupabaseAdmin } from "../services/supabaseAdmin";
import { grantPremiumInitialAiCredits } from "../services/aiCreditLedger";
import { logInfo, logWarn, logError } from "../logging/redaction";

// POST /api/payment/webhook
export const handleMayarWebhook = async (c: Context<{ Bindings: Env }>) => {
  logInfo("--> [BACKEND] Received Mayar webhook notification");
  try {
    // Verify webhook token from Mayar (X-Callback-Token header)
    const expectedToken = c.env.MAYAR_WEBHOOK_TOKEN || "";
    if (!expectedToken) {
      logError("--> Webhook rejected: Webhook secret is not configured");
      return c.json({ error: "Webhook secret is not configured" }, 500);
    }

    const callbackToken =
      c.req.header("x-callback-token") || c.req.header("X-Callback-Token") || "";
    if (callbackToken !== expectedToken) {
      logWarn("--> Webhook rejected: invalid or missing X-Callback-Token");
      return c.json({ error: "Unauthorized webhook request" }, 401);
    }

    // Safely parse body — Mayar test pings may send empty or non-JSON body
    let body: any = {};
    try {
      const rawText = await c.req.text();
      if (rawText && rawText.trim()) {
        body = JSON.parse(rawText);
      }
    } catch (parseErr) {
      logWarn("--> Webhook body is not valid JSON, treating as test ping");
      return c.json({ status: "ok", message: "Webhook endpoint is active" }, 200);
    }

    // Handle Mayar test/ping webhook (empty body or no event data)
    const event = body.event || body.type || "";

    // For test pings or non-purchase events, acknowledge immediately
    if (!body.data && !body.email && !body.customer) {
      logInfo("--> Webhook acknowledged (test/ping or no customer data)");
      return c.json({ status: "ok", message: "Webhook received successfully" }, 200);
    }

    // Extract email from multiple possible payload locations (Mayar sends different formats)
    const email =
      body.data?.customerEmail ||
      body.data?.email ||
      body.data?.customer?.email ||
      body.email ||
      body.customer?.email ||
      body.data?.transactions?.[0]?.email ||
      "";

    // Extract Mayar transaction ID for idempotency
    const mayarTransactionId =
      body.data?.id || body.data?.transactionId || body.data?.transaction_id || body.id || null;

    if (c.env.DEBUG_WEBHOOK_LOGS === "true") {
      logInfo("Webhook body metadata", {
        event,
        hasEmail: Boolean(email),
        transactionId: mayarTransactionId ? "[present]" : "[missing]",
      });
    }

    if (!email) {
      logWarn("--> Webhook ignored: No email found in payload");
      return c.json({ status: "ok", message: "Webhook received but no email found" }, 200);
    }

    // Only process purchase/payment success events for account creation
    const isPurchaseEvent =
      event === "payment.success" ||
      event === "payment" ||
      event === "purchase" ||
      body.data?.status === "paid" ||
      body.data?.status === "PAID" ||
      body.data?.isPaid === true ||
      body.data?.statusCode === 200;

    if (!isPurchaseEvent && event) {
      logInfo(`--> Webhook skipped: event '${event}' is not a purchase event`);
      return c.json(
        { status: "ok", message: `Event '${event}' acknowledged, no action needed` },
        200,
      );
    }

    const supabaseAdmin = getSupabaseAdmin(c);

    // Idempotency & Top-Up check:
    if (mayarTransactionId) {
      // 1. Check if it is a top-up transaction
      const { data: topup, error: topupErr } = await supabaseAdmin
        .from("ai_credit_topups")
        .select("*")
        .eq("mayar_transaction_id", mayarTransactionId)
        .maybeSingle();

      if (topupErr) {
        logError("Database query topup error:", topupErr);
      }

      if (topup) {
        if (topup.status === "paid") {
          logInfo(
            `--> Webhook idempotency: topup ${mayarTransactionId} already processed, skipping`,
          );
          return c.json({ status: "ok", message: "Topup already processed" }, 200);
        }

        logInfo(
          `--> Processing successful topup via atomic RPC for user: ${topup.user_id}, credits: ${topup.credits_amount}`,
        );

        // Atomically process top-up
        const { data: rpcResult, error: rpcErr } = await supabaseAdmin.rpc(
          "process_paid_ai_credit_topup",
          {
            p_mayar_transaction_id: mayarTransactionId,
          },
        );

        if (rpcErr) {
          logError("Error processing topup atomically:", rpcErr);
          return c.json({ error: "Failed to process topup atomically" }, 500);
        }

        const balanceAfter = (rpcResult as any)?.balance || 0;

        logInfo(`<-- Topup processed successfully! New balance: ${balanceAfter}`);
        return c.json({ status: "ok", message: "Topup successful", balance: balanceAfter }, 200);
      }

      // 2. Check if this transaction was already processed as an affiliate conversion
      const { data: existingConversion } = await supabaseAdmin
        .from("affiliate_conversions")
        .select("id")
        .eq("mayar_transaction_id", mayarTransactionId)
        .maybeSingle();

      if (existingConversion) {
        logInfo(
          `--> Webhook idempotency: transaction ${mayarTransactionId} already processed, skipping`,
        );
        return c.json({ status: "ok", message: "Transaction already processed" }, 200);
      }
    }

    // Fetch the pending registration details
    logInfo("--> Querying pending registration");
    const { data: pending, error: pendingErr } = await supabaseAdmin
      .from("pending_registrations")
      .select("*")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (pendingErr) {
      logError("Database query pending registration error:", pendingErr);
      return c.json({ error: "Database error querying pending registrations" }, 500);
    }

    if (!pending) {
      logInfo("--> Webhook skipped: No pending registration found");
      return c.json({ status: "ok", message: "No pending registration found" }, 200);
    }

    // Activate existing pending auth user
    logInfo("--> Activating existing pending Supabase Auth user:", pending.user_id);
    const { data: authData, error: signupErr } = await supabaseAdmin.auth.admin.updateUserById(
      pending.user_id,
      {
        app_metadata: {
          siklusio_access_status: "active",
        },
      },
    );

    if (signupErr) {
      logError("Supabase auth user activation error:", signupErr);
      return c.json({ error: "Auth user activation failed: " + signupErr.message }, 500);
    }

    const { data: premiumSession } = await supabaseAdmin
      .from("checkout_sessions")
      .select("id")
      .eq("email", email.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (authData.user?.id) {
      await grantPremiumInitialAiCredits({
        supabaseAdmin,
        userId: authData.user.id,
        referenceId: premiumSession?.id || null,
      });
    }

    // Process affiliate conversion from checkout_session
    const affiliateCode = pending.affiliate_code;
    if (affiliateCode) {
      logInfo(`--> Processing affiliate conversion for code: ${affiliateCode}`);

      const { data: session } = await supabaseAdmin
        .from("checkout_sessions")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("affiliate_code", affiliateCode)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: affiliate } = await supabaseAdmin
        .from("affiliates")
        .select("id, commission_type, commission_value, allow_zero_order_commission")
        .eq("code", affiliateCode)
        .eq("is_active", true)
        .maybeSingle();

      if (affiliate) {
        const amountPaid = session?.final_amount || body.data?.amount || 0;

        let commissionAmount = 0;
        if (Number(amountPaid) === 0 && !affiliate.allow_zero_order_commission) {
          commissionAmount = 0;
        } else if (affiliate.commission_type === "percentage") {
          commissionAmount = Math.floor(
            Number(amountPaid) * (Number(affiliate.commission_value) / 100),
          );
        } else {
          commissionAmount = Number(affiliate.commission_value);
        }

        const { error: convErr } = await supabaseAdmin.from("affiliate_conversions").insert({
          affiliate_id: affiliate.id,
          checkout_session_id: session?.id || null,
          buyer_name: pending.name,
          buyer_email: pending.email,
          buyer_whatsapp: pending.whatsapp,
          amount_paid: Number(amountPaid),
          commission_amount: commissionAmount,
          mayar_transaction_id: mayarTransactionId,
        });

        if (convErr) {
          if (convErr.code === "23505") {
            logInfo(
              `--> Affiliate conversion already exists for tx ${mayarTransactionId} (idempotent)`,
            );
          } else {
            logError("Error inserting affiliate conversion:", convErr);
          }
        } else {
          logInfo(`--> Affiliate conversion recorded: commission Rp ${commissionAmount}`);
        }
      }

      if (session) {
        await supabaseAdmin
          .from("checkout_sessions")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("id", session.id);
      }
    }

    // Delete the pending registration record (cleanup)
    logInfo("--> Deleting pending registration record");
    await supabaseAdmin.from("pending_registrations").delete().eq("id", pending.id);

    logInfo("<-- Webhook processed successfully! User created ID:", authData.user?.id);
    return c.json({ status: "ok", message: "Registration successful!", userId: authData.user?.id });
  } catch (error: any) {
    logError("<-- Webhook handler exception:", error.stack || error);
    return c.json({ error: "Internal server error processing webhook" }, 500);
  }
};

// GET /api/payment/webhook — URL verification
export const verifyWebhookEndpoint = (c: Context<{ Bindings: Env }>) => {
  console.log("--> [BACKEND] Webhook URL verification (GET)");
  return c.json({ status: "ok", message: "Webhook endpoint is active" }, 200);
};
