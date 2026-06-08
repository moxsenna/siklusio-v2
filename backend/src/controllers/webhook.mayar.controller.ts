import { Context } from "hono";
import { type Env } from "../env";
import { getSupabaseAdmin } from "../services/supabaseAdmin";
import { logInfo, logWarn, logError } from "../logging/redaction";
import { hasAffiliateConversionForTransaction } from "../services/affiliateConversionService";
import {
  processMayarWebhookPremiumActivation,
  retryPaidSessionPurchaseMetaCapi,
} from "../services/paymentActivationService";

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
      event === "payment.received" ||
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
    let session: any = null;

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

      // 4. Find checkout session with all tracking fields selected
      if (mayarTransactionId) {
        const { data: s } = await supabaseAdmin
          .from("checkout_sessions")
          .select(`
            id,
            email,
            whatsapp,
            final_amount,
            mayar_transaction_id,
            hashed_email,
            hashed_phone,
            fbp,
            fbc,
            client_ip_address,
            client_user_agent,
            meta_test_event_code,
            purchase_capi_sent_at,
            purchase_capi_event_id,
            status
          `)
          .eq("mayar_transaction_id", mayarTransactionId)
          .maybeSingle();
        session = s;
      }

      if (!session && email) {
        logInfo(`--> Checkout session not found by transaction ID ${mayarTransactionId}. Falling back to email...`);
        const { data: s } = await supabaseAdmin
          .from("checkout_sessions")
          .select(`
            id,
            email,
            whatsapp,
            final_amount,
            mayar_transaction_id,
            hashed_email,
            hashed_phone,
            fbp,
            fbc,
            client_ip_address,
            client_user_agent,
            meta_test_event_code,
            purchase_capi_sent_at,
            purchase_capi_event_id,
            status
          `)
          .eq("email", email.toLowerCase())
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        session = s;
      }

      // 6. Check if session already paid
      if (session && session.status === "paid") {
        if (session.purchase_capi_sent_at) {
          logInfo(`--> Webhook idempotency: checkout_session ${session.id} already paid and CAPI sent, skipping`);
          return c.json({ status: "ok", message: "Transaction already processed" }, 200);
        }

        await retryPaidSessionPurchaseMetaCapi({
          c,
          supabaseAdmin,
          session,
          mayarTransactionId,
        });

        return c.json({ status: "ok", message: "CAPI retry processed" }, 200);
      }

      if (await hasAffiliateConversionForTransaction(supabaseAdmin, mayarTransactionId)) {
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

    let activationResult: { userId: string | null };
    try {
      activationResult = await processMayarWebhookPremiumActivation({
        c,
        supabaseAdmin,
        pending,
        session,
        mayarTransactionId,
        email,
        fallbackAmount: body.data?.amount ? Number(body.data.amount) : null,
      });
    } catch (activationErr: any) {
      logError("Supabase auth user activation error:", activationErr);
      return c.json(
        {
          error:
            activationErr instanceof Error
              ? "Auth user activation failed: " + activationErr.message
              : "Auth user activation failed",
        },
        500,
      );
    }

    logInfo("<-- Webhook processed successfully! User created ID:", activationResult.userId);
    return c.json({
      status: "ok",
      message: "Registration successful!",
      userId: activationResult.userId,
    });
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
