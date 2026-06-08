import { Context } from "hono";
import { type Env } from "../env";
import { requireUser } from "../middlewares/auth";
import { getSupabaseAdmin } from "../services/supabaseAdmin";
import { resolveTopupPackage } from "../payments/topupPackages";
import { createMayarPaymentLink } from "../services/mayar";
import { logInfo, logError } from "../logging/redaction";
import { processCheckoutRegistration } from "../services/checkoutRegistrationService";

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
    const input = await c.req.json();
    const result = await processCheckoutRegistration({
      c,
      input,
      clientIp: c.req.header("CF-Connecting-IP") || "",
      clientUa: c.req.header("User-Agent") || "",
    });

    if (result.ok === false) {
      return c.json({ error: result.error }, result.status);
    }

    return c.json({ paymentUrl: result.paymentUrl });
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
