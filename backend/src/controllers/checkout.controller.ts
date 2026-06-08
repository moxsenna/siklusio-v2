import { Context } from "hono";
import { type Env } from "../env";
import { requireUser } from "../middlewares/auth";
import { getSupabaseAdmin } from "../services/supabaseAdmin";
import { resolveTopupPackage } from "../payments/topupPackages";
import { createMayarPaymentLink } from "../services/mayar";
import { hashData, formatE164Phone, sendMetaCapiEvent } from "../services/metaCapi";
import { grantPremiumInitialAiCredits } from "../services/aiCreditLedger";
import { logInfo, logError } from "../logging/redaction";
import { sendWhatsappAutoresponder } from "../services/fonnte";

import { upsertAdminCrmLead } from "../services/adminCrm";

// POST /api/checkout/topup
export const checkoutTopup = async (c: Context<{ Bindings: Env }>) => {
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
      customerName: name,
      amount: finalAmount,
      productName: `Top Up Kredit AI Siklusio (${credits} Kredit)`,
      productDescription: `Top up saldo kredit AI Siklusio sebanyak ${credits} kredit.`,
      productId: selectedPackage.id || `ai_credit_topup_${credits}`,
      redirectUrl: "https://app.siklusio.web.id/auth?status=topup_success",
      email,
      mobile: whatsapp,
    });

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
};

// POST /api/checkout/register
export const checkoutRegister = async (c: Context<{ Bindings: Env }>) => {
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

    let validatedTestEventCode: string | undefined = undefined;
    if (
      test_event_code &&
      c.env.META_TEST_MODE_SECRET &&
      test_secret === c.env.META_TEST_MODE_SECRET
    ) {
      validatedTestEventCode = test_event_code;
    }

    const clientIp = c.req.header("CF-Connecting-IP") || "";
    const clientUa = c.req.header("User-Agent") || "";
    const hashedEmail = await hashData(email);
    const hashedPhone = await hashData(formatE164Phone(whatsapp));

    const mayarKey = c.env.MAYAR_API_KEY;
    if (!mayarKey) {
      logError("MAYAR_API_KEY secret is not configured");
      return c.json({ error: "Konfigurasi pembayaran belum tersedia. Hubungi admin." }, 500);
    }

    const supabaseAdmin = getSupabaseAdmin(c);

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

    if (finalAmount > 0 && finalAmount < 10000) {
      finalAmount = 10000;
    }

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

    const metaAttribution: any = {
      lead_event_id: lead_event_id || null,
      fbp: fbp || null,
      fbc: fbc || null,
      client_ip_address: clientIp || null,
      client_user_agent: clientUa || null,
      hashed_email: hashedEmail || null,
      hashed_phone: hashedPhone || null,
      meta_test_event_code: validatedTestEventCode || null,
    };

    if (finalAmount === 0) {
      logInfo("--> 100% Free Coupon applied! Bypassing Mayar...");

      const { data: authData, error: signupErr } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        password: password,
        email_confirm: true,
        user_metadata: { name, whatsapp },
        app_metadata: { siklusio_access_status: "active" },
      });

      if (signupErr) {
        logError("Supabase auth user creation error:", signupErr);
        return c.json({ error: "Gagal membuat akun: " + signupErr.message }, 500);
      }

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
          ...metaAttribution,
        })
        .select()
        .single();

      try {
        await upsertAdminCrmLead(supabaseAdmin, {
          userId: authData.user?.id || null,
          name,
          email: email.toLowerCase(),
          whatsapp,
          source: "free_bypass_checkout",
          referralCode: couponCode ? couponCode.trim().toUpperCase() : null,
          affiliateCode: validatedAffiliateCode,
          leadStatus: "paid",
          paymentStatus: "paid_manual",
          checkoutUrl: "https://app.siklusio.web.id/auth?status=success_free",
          mayarTransactionId: null,
          amount: 0,
        });
      } catch (crmErr) {
        logError("CRM upsert failed during free bypass checkout:", crmErr);
      }

      if (validatedAffiliateCode && session) {
        const { data: aff } = await supabaseAdmin
          .from("affiliates")
          .select("id, commission_type, commission_value, allow_zero_order_commission")
          .eq("code", validatedAffiliateCode)
          .maybeSingle();

        if (aff) {
          let commissionAmount = 0;
          if (aff.allow_zero_order_commission) {
            commissionAmount = aff.commission_type === "nominal" ? Number(aff.commission_value) : 0;
          }

          await supabaseAdmin.from("affiliate_conversions").insert({
            affiliate_id: aff.id,
            checkout_session_id: session.id,
            buyer_name: name,
            buyer_email: email.toLowerCase(),
            buyer_whatsapp: whatsapp,
            amount_paid: 0,
            commission_amount: commissionAmount,
            mayar_transaction_id: null,
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

      if (session) {
        const eventId = `purchase_free_${session.id}`;
        const userData = {
          em: hashedEmail ? [hashedEmail] : undefined,
          ph: hashedPhone ? [hashedPhone] : undefined,
          fbp: fbp || undefined,
          fbc: fbc || undefined,
          client_ip_address: clientIp || undefined,
          client_user_agent: clientUa || undefined,
        };
        const customData = {
          currency: "IDR",
          value: 0,
          content_name: "Siklusio Premium Lifetime",
          content_type: "product",
          content_ids: ["siklusio_premium_lifetime"],
          num_items: 1,
          order_id: session.id,
        };

        let capiSuccess = false;
        if (c.env.META_PIXEL_ID && c.env.META_CAPI_ACCESS_TOKEN) {
          const res = await sendMetaCapiEvent(
            c,
            "Purchase",
            eventId,
            userData,
            customData,
            validatedTestEventCode
          );
          capiSuccess = res.ok;
        } else {
          capiSuccess = true;
        }

        if (capiSuccess) {
          await supabaseAdmin
            .from("checkout_sessions")
            .update({
              purchase_capi_sent_at: new Date().toISOString(),
              purchase_capi_event_id: eventId,
            })
            .eq("id", session.id);
        }
      }

      const autoresponderPromise = sendWhatsappAutoresponder({
        c,
        eventKey: "payment_completed",
        recipientWhatsapp: whatsapp,
        recipientName: name,
        idempotencyKey: `wa:payment_completed:free_bypass:${session.id}`,
        templateContext: {
          nama: name,
          email: email.toLowerCase(),
          no_hp: whatsapp,
          link_pembayaran: "-",
          jumlah_pembayaran: "Rp 0",
          status_pembayaran: "Gratis (Kupon 100%)",
          kode_kupon: couponCode ? couponCode.trim().toUpperCase() : "-",
          kode_affiliate: validatedAffiliateCode || "-",
          link_login: "https://app.siklusio.web.id/auth",
          tanggal: new Date().toLocaleDateString("id-ID"),
          transaction_id: session.id,
        },
        metadata: {
          checkout_session_id: session.id,
          source: "free_bypass",
        },
      }).catch((err) => {
        logError("Free Bypass WhatsApp autoresponder failed:", err);
      });

      try {
        c.executionCtx.waitUntil(autoresponderPromise);
      } catch (_) {
        // Fallback for non-Cloudflare environments
      }

      logInfo("<-- Free Checkout successful! User ID:", authData.user?.id);
      return c.json({ paymentUrl: "https://app.siklusio.web.id/auth?status=success_free" });
    }

    logInfo("--> Creating Supabase Auth user immediately as pending...");
    const { data: authData, error: signupErr } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password: password,
      email_confirm: true,
      user_metadata: { name, whatsapp },
      app_metadata: { siklusio_access_status: "pending_payment" },
    });

    if (signupErr) {
      logError("Supabase auth user creation error:", signupErr);
      return c.json({ error: "Gagal membuat akun: " + signupErr.message }, 500);
    }

    const userId = authData.user.id;

    logInfo("--> Inserting pending registration...");
    const { data: pendingRow, error: insertErr } = await supabaseAdmin
      .from("pending_registrations")
      .upsert(
        {
          email: email.toLowerCase(),
          user_id: userId,
          name,
          whatsapp,
          coupon_code: couponCode ? couponCode.trim().toUpperCase() : null,
          affiliate_code: validatedAffiliateCode,
        },
        { onConflict: "email" },
      )
      .select("id")
      .maybeSingle();

    if (insertErr) {
      logError("DB Insert pending registration error:", insertErr);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return c.json({ error: "Gagal menyimpan pendaftaran tertunda. Silakan coba kembali." }, 500);
    }

    logInfo("--> Calling Mayar API to create payment link...");
    let paymentUrl = "";
    let mayarTxId = "";
    try {
      const result = await createMayarPaymentLink(mayarKey, {
        customerName: name,
        amount: finalAmount,
        productName: "Siklusio Premium Lifetime",
        productDescription:
          "Akses selamanya Siklusio Premium: pelacak ovulasi, AI insight, komunitas aman, dan fitur promil.",
        productId: "siklusio_premium_lifetime",
        redirectUrl: "https://app.siklusio.web.id/auth?status=success",
        email: email.toLowerCase(),
        mobile: whatsapp,
      });
      paymentUrl = result.link;
      mayarTxId = result.id;
    } catch (payErr: any) {
      logError("Mayar API error:", payErr);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      await supabaseAdmin.from("pending_registrations").delete().eq("email", email.toLowerCase());
      return c.json({ error: "Gagal membuat link pembayaran. Hubungi admin." }, 500);
    }

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
      ...metaAttribution,
    });

    if (sessionErr) {
      logError("DB Insert checkout_session error:", sessionErr);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      await supabaseAdmin.from("pending_registrations").delete().eq("email", email.toLowerCase());
      return c.json({ error: "Gagal mencatat sesi pembayaran. Silakan coba kembali." }, 500);
    }

    try {
      await upsertAdminCrmLead(supabaseAdmin, {
        userId,
        pendingRegistrationId: pendingRow?.id || null,
        name,
        email: email.toLowerCase(),
        whatsapp,
        source: "checkout_register",
        referralCode: couponCode ? couponCode.trim().toUpperCase() : null,
        affiliateCode: validatedAffiliateCode,
        leadStatus: "checkout_started",
        paymentStatus: "pending_payment",
        checkoutUrl: paymentUrl,
        mayarTransactionId: mayarTxId,
        amount: finalAmount,
      });
    } catch (crmErr) {
      logError("CRM upsert failed during paid checkout registration:", crmErr);
    }

    const autoresponderPromise = sendWhatsappAutoresponder({
      c,
      eventKey: "registration_completed",
      recipientWhatsapp: whatsapp,
      recipientName: name,
      idempotencyKey: `wa:registration_completed:${mayarTxId || email.toLowerCase()}`,
      templateContext: {
        nama: name,
        email: email.toLowerCase(),
        no_hp: whatsapp,
        link_pembayaran: paymentUrl,
        jumlah_pembayaran: `Rp ${finalAmount.toLocaleString("id-ID")}`,
        status_pembayaran: "Menunggu Pembayaran",
        kode_kupon: couponCode ? couponCode.trim().toUpperCase() : "-",
        kode_affiliate: validatedAffiliateCode || "-",
        link_login: "https://app.siklusio.web.id/auth",
        tanggal: new Date().toLocaleDateString("id-ID"),
        transaction_id: mayarTxId || "-",
      },
      metadata: {
        checkout_session_status: "pending",
        mayar_transaction_id: mayarTxId,
        email: email.toLowerCase(),
      },
    }).catch((err) => {
      logError("Registration WhatsApp autoresponder failed:", err);
    });

    try {
      c.executionCtx.waitUntil(autoresponderPromise);
    } catch (_) {
      // Fallback for non-Cloudflare environments
    }

    logInfo("<-- Checkout request successful! Payment URL:", paymentUrl);
    return c.json({ paymentUrl });
  } catch (error: any) {
    logError("<-- Checkout register error:", error.stack || error);
    return c.json({ error: "Terjadi kesalahan internal pada server pendaftaran." }, 500);
  }
};

// GET /api/affiliate/validate
export const validateAffiliate = async (c: Context<{ Bindings: Env }>) => {
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
};

// GET /api/affiliate/me
export const getAffiliateMe = async (c: Context<{ Bindings: Env }>) => {
  console.log("--> [BACKEND] GET /api/affiliate/me");
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Unauthorized" }, 401);

    const { supabaseAdmin, user } = auth;
    const { data: affiliate } = await supabaseAdmin
      .from("affiliates")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();

    return c.json({ affiliate: affiliate || null });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// POST /api/affiliate/register
export const registerAffiliate = async (c: Context<{ Bindings: Env }>) => {
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

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("name, whatsapp_number")
      .eq("id", user.id)
      .maybeSingle();

    const name = profile?.name || user.email?.split("@")[0] || "User";
    const whatsapp = profile?.whatsapp_number || "-";

    const { data, error } = await supabaseAdmin.rpc("create_affiliate_with_coupon", {
      p_name: name,
      p_email: user.email,
      p_whatsapp: whatsapp,
      p_code: safeCode,
      p_commission_type: "percentage",
      p_commission_value: 40,
      p_bank_name: bank_name || null,
      p_account_number: account_number || null,
      p_account_holder: account_holder || null,
      p_auto_coupon: false,
      p_coupon_discount_type: "percentage",
      p_coupon_discount_value: 0,
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
};

// GET /api/affiliate/me/conversions
export const getAffiliateConversions = async (c: Context<{ Bindings: Env }>) => {
  console.log("--> [BACKEND] GET /api/affiliate/me/conversions");
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Unauthorized" }, 401);

    const { supabaseAdmin, user } = auth;
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
};

// PATCH /api/affiliate/me/bank
export const updateAffiliateBank = async (c: Context<{ Bindings: Env }>) => {
  console.log("--> [BACKEND] PATCH /api/affiliate/me/bank");
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Unauthorized" }, 401);

    const { supabaseAdmin, user } = auth;
    const { bank_name, account_number, account_holder } = await c.req.json();

    const { error } = await supabaseAdmin
      .from("affiliates")
      .update({ bank_name, account_number, account_holder })
      .eq("email", user.email);

    if (error) throw error;
    return c.json({ status: "ok" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};
