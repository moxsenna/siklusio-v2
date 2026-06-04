import { Hono } from "hono";
import { type Env } from "../env";
import { requireUser } from "../middleware/auth";
import { getSupabaseAdmin } from "../services/supabaseAdmin";
import { resolveTopupPackage } from "../payments/topupPackages";
import { createMayarPaymentLink } from "../services/mayar";
import { hashData, formatE164Phone } from "../services/metaCapi";
import { grantPremiumInitialAiCredits } from "../services/aiCreditLedger";
import { logInfo, logError } from "../logging/redaction";

const router = new Hono<{ Bindings: Env }>();

// Endpoint for topup AI Credits
router.post("/api/checkout/topup", async (c) => {
  console.log("--> [BACKEND] Received request /api/checkout/topup");
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Missing or invalid session" }, 401);

    const { packageId } = await c.req.json();

    const selectedPackage = resolveTopupPackage(packageId);
    if (!selectedPackage) {
      return c.json({ error: "Paket topup tidak valid." }, 400);
    }

    const mayarKey = c.env.MAYAR_API_KEY;
    if (!mayarKey) {
      return c.json({ error: "Konfigurasi pembayaran belum tersedia." }, 500);
    }

    const finalAmount = selectedPackage.price;
    const credits = selectedPackage.credits;
    const { supabaseAdmin, user } = auth;

    // Get user details
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("name, whatsapp_number")
      .eq("id", user.id)
      .maybeSingle();

    const name = profile?.name || user.email?.split("@")[0] || "User";
    const whatsapp = profile?.whatsapp_number || "-";
    const email = user.email || "";

    console.log("--> Calling Mayar API to create topup link...");
    const { link: paymentUrl, id: mayarTxId } = await createMayarPaymentLink(mayarKey, {
      name: `Top Up Kredit AI Siklusio (${credits} Kredit)`,
      amount: finalAmount,
      description: `Top up saldo kredit AI Siklusio sebanyak ${credits} kredit.`,
      redirectUrl: "https://app.siklusio.web.id/auth?status=topup_success",
      email: email,
      mobile: whatsapp,
      customerName: name,
    });

    // Create ai_credit_topups record
    const { error: insertErr } = await supabaseAdmin.from("ai_credit_topups").insert({
      user_id: user.id,
      mayar_link: paymentUrl,
      mayar_transaction_id: mayarTxId,
      amount_rp: finalAmount,
      credits_amount: credits,
      status: "pending",
    });

    if (insertErr) {
      console.error("DB Insert topup error:", insertErr);
      return c.json({ error: "Gagal memproses permintaan topup." }, 500);
    }

    return c.json({ paymentUrl });
  } catch (error: any) {
    console.error("<-- Checkout topup error:", error.stack || error);
    return c.json({ error: "Terjadi kesalahan internal pada server topup." }, 500);
  }
});

// Endpoint for pre-checkout registration + Mayar dynamic payment
router.post("/api/checkout/register", async (c) => {
  logInfo("--> [BACKEND] Received request /api/checkout/register");
  try {
    const {
      name,
      email,
      whatsapp,
      password,
      couponCode,
      affiliateCode,
      lead_event_id,
      fbp,
      fbc,
      test_event_code,
      test_secret,
    } = await c.req.json();

    if (!name || !email || !whatsapp || !password) {
      return c.json({ error: "Semua formulir pendaftaran wajib diisi." }, 400);
    }

    // Validate dynamic test_event_code with production guardrails
    let validatedTestEventCode: string | undefined = undefined;
    if (test_event_code) {
      const secret = c.env.META_TEST_MODE_SECRET;
      if (secret) {
        if (test_secret === secret) {
          validatedTestEventCode = test_event_code;
        }
      } else {
        // No secret configured, allow dynamic code on both production and local/dev
        validatedTestEventCode = test_event_code;
      }
    }

    const clientIp = c.req.header("CF-Connecting-IP") || "";
    const clientUa = c.req.header("User-Agent") || "";
    const hashedEmail = await hashData(email);
    const hashedPhone = await hashData(formatE164Phone(whatsapp));

    // Validate Mayar API key is configured
    const mayarKey = c.env.MAYAR_API_KEY;
    if (!mayarKey) {
      logError("MAYAR_API_KEY secret is not configured");
      return c.json({ error: "Konfigurasi pembayaran belum tersedia. Hubungi admin." }, 500);
    }

    const supabaseAdmin = getSupabaseAdmin(c);

    // Check if email already registered in Supabase
    logInfo("--> Checking existing auth users...");
    const { data: authUserList, error: authErr } = await supabaseAdmin.auth.admin.listUsers();
    if (authErr) {
      logError("Error listing users:", authErr);
    }
    const emailExists = authUserList?.users.some(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase(),
    );

    if (emailExists) {
      return c.json(
        { error: "Email ini sudah terdaftar. Silakan login langsung di aplikasi." },
        400,
      );
    }

    // Determine final price based on coupon
    let finalAmount = 37000;

    if (couponCode) {
      const normalizedCode = couponCode.trim().toUpperCase();
      logInfo(`--> Validating coupon: ${normalizedCode}`);
      const { data: coupon, error: couponErr } = await supabaseAdmin
        .from("coupons")
        .select("*")
        .eq("code", normalizedCode)
        .eq("is_active", true)
        .maybeSingle();

      if (couponErr) {
        logError("Error fetching coupon:", couponErr);
        return c.json(
          { error: "Terjadi kesalahan saat memvalidasi kupon. Silakan coba lagi." },
          500,
        );
      }

      if (coupon) {
        if (coupon.discount_type === "nominal") {
          finalAmount = Math.max(0, finalAmount - Number(coupon.discount_value));
        } else if (coupon.discount_type === "percentage") {
          const discount = Math.floor(finalAmount * (Number(coupon.discount_value) / 100));
          finalAmount = Math.max(0, finalAmount - discount);
        }
        logInfo(`--> Coupon applied. New amount: ${finalAmount}`);
      } else {
        return c.json({ error: "Kode kupon tidak valid atau sudah tidak aktif." }, 400);
      }
    }

    // Safety check: Mayar minimum is 10k, unless it's completely free
    if (finalAmount > 0 && finalAmount < 10000) {
      finalAmount = 10000;
    }

    // If Free / 100% discount, bypass Mayar and create user directly
    // Resolve affiliate code if provided
    const normalizedAffiliateCode = affiliateCode ? affiliateCode.trim().toUpperCase() : null;
    let validatedAffiliateCode: string | null = null;
    if (normalizedAffiliateCode) {
      const { data: aff } = await supabaseAdmin
        .from("affiliates")
        .select("code")
        .eq("code", normalizedAffiliateCode)
        .eq("is_active", true)
        .maybeSingle();
      if (aff) validatedAffiliateCode = aff.code;
      logInfo(`--> Affiliate code '${normalizedAffiliateCode}' validated: ${!!aff}`);
    }

    // Prepare Meta Conversions API attribution object
    const metaAttribution: any = {
      lead_event_id: lead_event_id || null,
      fbp: fbp || null,
      fbc: fbc || null,
      client_ip_address: clientIp || null,
      client_user_agent: clientUa || null,
      hashed_email: hashedEmail || null,
      hashed_phone: hashedPhone || null,
    };
    if (validatedTestEventCode) {
      metaAttribution.test_event_code = validatedTestEventCode;
    }

    if (finalAmount === 0) {
      logInfo("--> 100% Free Coupon applied! Bypassing Mayar...");

      // Create user directly
      const { data: authData, error: signupErr } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        password: password,
        email_confirm: true,
        user_metadata: {
          name: name,
          whatsapp: whatsapp,
        },
        app_metadata: {
          siklusio_access_status: "active",
        },
      });

      if (signupErr) {
        logError("Supabase auth user creation error:", signupErr);
        return c.json({ error: "Gagal membuat akun: " + signupErr.message }, 500);
      }

      // Create checkout_session for free bypass [FIX-2]
      const { data: session } = await supabaseAdmin
        .from("checkout_sessions")
        .insert({
          email: email.toLowerCase(),
          name,
          whatsapp,
          coupon_code: couponCode ? couponCode.trim().toUpperCase() : null,
          affiliate_code: validatedAffiliateCode,
          final_amount: 0,
          status: "free_bypass",
          paid_at: new Date().toISOString(),
        })
        .select()
        .single();

      // Record affiliate conversion for free orders [FIX-5]
      if (validatedAffiliateCode && session) {
        const { data: aff } = await supabaseAdmin
          .from("affiliates")
          .select("id, commission_type, commission_value, allow_zero_order_commission")
          .eq("code", validatedAffiliateCode)
          .maybeSingle();

        if (aff) {
          // [FIX-5] Default: no commission for free orders unless explicitly allowed
          let commissionAmount = 0;
          if (aff.allow_zero_order_commission) {
            commissionAmount = aff.commission_type === "nominal" ? Number(aff.commission_value) : 0; // percentage of 0 is always 0
          }

          await supabaseAdmin.from("affiliate_conversions").insert({
            affiliate_id: aff.id,
            checkout_session_id: session.id,
            buyer_name: name,
            buyer_email: email.toLowerCase(),
            buyer_whatsapp: whatsapp,
            amount_paid: 0,
            commission_amount: commissionAmount,
            mayar_transaction_id: null, // free bypass has no Mayar tx
          });
          logInfo(
            `--> Affiliate conversion recorded (free bypass, commission: ${commissionAmount})`,
          );
        }
      }

      if (authData.user?.id) {
        await grantPremiumInitialAiCredits({
          supabaseAdmin,
          userId: authData.user.id,
          referenceId: session?.id || null,
        });
      }

      logInfo("<-- Free Checkout successful! User ID:", authData.user?.id);
      return c.json({ paymentUrl: "https://app.siklusio.web.id/auth?status=success_free" });
    }

    // Create the Supabase Auth user immediately in auth, but mark with app_metadata
    logInfo("--> Creating Supabase Auth user immediately as pending...");
    const { data: authData, error: signupErr } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password: password,
      email_confirm: true,
      user_metadata: {
        name: name,
        whatsapp: whatsapp,
      },
      app_metadata: {
        siklusio_access_status: "pending_payment",
      },
    });

    if (signupErr) {
      logError("Supabase auth user creation error:", signupErr);
      return c.json({ error: "Gagal membuat akun: " + signupErr.message }, 500);
    }

    const userId = authData.user.id;

    // Normal paid flow: Save pending registration & call Mayar (without plaintext password)
    logInfo("--> Inserting pending registration...");
    const { error: insertErr } = await supabaseAdmin.from("pending_registrations").upsert(
      {
        email: email.toLowerCase(),
        user_id: userId,
        name,
        whatsapp,
        coupon_code: couponCode ? couponCode.trim().toUpperCase() : null,
        affiliate_code: validatedAffiliateCode,
      },
      { onConflict: "email" },
    );

    if (insertErr) {
      logError("DB Insert pending registration error:", insertErr);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return c.json({ error: "Gagal menyimpan pendaftaran tertunda. Silakan coba kembali." }, 500);
    }

    // Create dynamic payment via Mayar API
    logInfo("--> Calling Mayar API to create payment link...");
    let paymentUrl = "";
    let mayarTxId = "";
    try {
      const result = await createMayarPaymentLink(mayarKey, {
        name: "Siklusio Premium — Akses Selamanya",
        amount: finalAmount,
        description:
          "Investasi satu kali untuk akses selamanya: Pelacak Ovulasi Medis, Asisten AI 24/7, Komunitas Aman, dan Jembatan Rasa Suami.",
        redirectUrl: "https://app.siklusio.web.id/auth?status=success",
        email: email.toLowerCase(),
        mobile: whatsapp,
        customerName: name,
      });
      paymentUrl = result.link;
      mayarTxId = result.id;
    } catch (payErr: any) {
      logError("Mayar API error:", payErr);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      await supabaseAdmin.from("pending_registrations").delete().eq("email", email.toLowerCase());
      return c.json({ error: "Gagal membuat link pembayaran. Hubungi admin." }, 500);
    }

    // Create checkout_session for paid flow [FIX-2]
    const { error: sessionErr } = await supabaseAdmin.from("checkout_sessions").insert({
      email: email.toLowerCase(),
      name,
      whatsapp,
      coupon_code: couponCode ? couponCode.trim().toUpperCase() : null,
      affiliate_code: validatedAffiliateCode,
      final_amount: finalAmount,
      mayar_link: paymentUrl,
      mayar_transaction_id: mayarTxId,
      status: "pending",
    });

    if (sessionErr) {
      logError("DB Insert checkout_session error:", sessionErr);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      await supabaseAdmin.from("pending_registrations").delete().eq("email", email.toLowerCase());
      return c.json({ error: "Gagal mencatat sesi pembayaran. Silakan coba kembali." }, 500);
    }

    logInfo("<-- Checkout request successful! Payment URL:", paymentUrl);
    return c.json({ paymentUrl });
  } catch (error: any) {
    logError("<-- Checkout register error:", error.stack || error);
    return c.json({ error: "Terjadi kesalahan internal pada server pendaftaran." }, 500);
  }
});

// ============================================================
// Affiliate Public Endpoint – validate referral code
// ============================================================
router.get("/api/affiliate/validate", async (c) => {
  console.log("--> [BACKEND] GET /api/affiliate/validate");
  try {
    const code = (c.req.query("code") || "").trim().toUpperCase();
    if (!code) return c.json({ valid: false });

    const supabaseAdmin = getSupabaseAdmin(c);
    const { data: affiliate } = await supabaseAdmin
      .from("affiliates")
      .select("code, commission_type, commission_value")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();

    if (!affiliate) return c.json({ valid: false });

    // Check if matching coupon exists for discount label
    const { data: coupon } = await supabaseAdmin
      .from("coupons")
      .select("discount_type, discount_value")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();

    let discountLabel = "";
    if (coupon) {
      discountLabel =
        coupon.discount_type === "percentage"
          ? `Diskon ${coupon.discount_value}%`
          : `Diskon Rp ${Number(coupon.discount_value).toLocaleString("id-ID")}`;
    }

    return c.json({ valid: true, discountLabel });
  } catch (error: any) {
    console.error("Affiliate validate error:", error);
    return c.json({ valid: false });
  }
});

// GET /api/affiliate/me – Get affiliate profile for logged-in user
router.get("/api/affiliate/me", async (c) => {
  console.log("--> [BACKEND] GET /api/affiliate/me");
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Unauthorized" }, 401);

    const { supabaseAdmin, user } = auth;

    // Find affiliate by user email
    const { data: affiliate } = await supabaseAdmin
      .from("affiliates")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();

    return c.json({ affiliate: affiliate || null });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/affiliate/register – Self-register as affiliate
router.post("/api/affiliate/register", async (c) => {
  console.log("--> [BACKEND] POST /api/affiliate/register");
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Unauthorized" }, 401);

    const { supabaseAdmin, user } = auth;
    const { code, bank_name, account_number, account_holder } = await c.req.json();

    if (!code) {
      return c.json({ error: "Kode referal wajib diisi" }, 400);
    }
    const safeCode = code.trim().toUpperCase().replace(/\s/g, "");

    // Get user profile details
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("name, whatsapp_number")
      .eq("id", user.id)
      .maybeSingle();

    const name = profile?.name || user.email?.split("@")[0] || "User";
    const whatsapp = profile?.whatsapp_number || "-";

    // Use transactional RPC to also create coupon 10%
    const { data, error } = await supabaseAdmin.rpc("create_affiliate_with_coupon", {
      p_name: name,
      p_email: user.email,
      p_whatsapp: whatsapp,
      p_code: safeCode,
      p_commission_type: "percentage",
      p_commission_value: 40, // 40% default user commission
      p_bank_name: bank_name || null,
      p_account_number: account_number || null,
      p_account_holder: account_holder || null,
      p_auto_coupon: false, // disabled 10% discount auto coupon
      p_coupon_discount_type: "percentage",
      p_coupon_discount_value: 0, // no default coupon discount for buyer
    });

    if (error) {
      if (error.code === "23505")
        return c.json({ error: "Kode referal sudah digunakan, pilih kode lain." }, 400);
      throw error;
    }

    return c.json({ affiliate: data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/affiliate/me/conversions – List user's conversions
router.get("/api/affiliate/me/conversions", async (c) => {
  console.log("--> [BACKEND] GET /api/affiliate/me/conversions");
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Unauthorized" }, 401);

    const { supabaseAdmin, user } = auth;

    // Find affiliate ID first
    const { data: affiliate } = await supabaseAdmin
      .from("affiliates")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();

    if (!affiliate) {
      return c.json({ conversions: [] });
    }

    const { data: conversions, error } = await supabaseAdmin
      .from("affiliate_conversions")
      .select("*")
      .eq("affiliate_id", affiliate.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return c.json({ conversions: conversions || [] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /api/affiliate/me/bank – Update user's bank info
router.patch("/api/affiliate/me/bank", async (c) => {
  console.log("--> [BACKEND] PATCH /api/affiliate/me/bank");
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Unauthorized" }, 401);

    const { supabaseAdmin, user } = auth;
    const { bank_name, account_number, account_holder } = await c.req.json();

    const { error } = await supabaseAdmin
      .from("affiliates")
      .update({
        bank_name,
        account_number,
        account_holder,
      })
      .eq("email", user.email);

    if (error) throw error;
    return c.json({ status: "ok" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default router;
