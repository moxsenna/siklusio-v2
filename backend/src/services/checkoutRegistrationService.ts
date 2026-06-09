import type { SupabaseClient } from "@supabase/supabase-js";
import type { Context } from "hono";
import type { Env } from "../env";
import { createMayarPaymentLink } from "./mayar";
import { hashData, formatE164Phone, sendMetaCapiEvent } from "./metaCapi";
import { grantPremiumInitialAiCredits } from "./aiCreditLedger";
import { upsertAdminCrmLead } from "./adminCrm";
import { sendWhatsappAutoresponder } from "./fonnte";
import { logInfo, logError } from "../logging/redaction";
import { getSupabaseAdmin } from "./supabaseAdmin";

export type BindingsContext = Context<{ Bindings: Env }>;

export const BASE_CHECKOUT_AMOUNT = 37000;
export const MIN_PAID_CHECKOUT_AMOUNT = 10000;

export type CheckoutRegisterInput = {
  name?: string;
  email?: string;
  whatsapp?: string;
  password?: string;
  couponCode?: string | null;
  affiliateCode?: string | null;
  lead_event_id?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  test_event_code?: string | null;
  test_secret?: string | null;
};

export type CouponRecord = {
  discount_type: string;
  discount_value: number;
};

export const DUPLICATE_EMAIL_ERROR =
  "Email ini sudah terdaftar. Silakan login langsung di aplikasi.";

export type CheckoutRegisterFailure = {
  ok: false;
  status: 400 | 500;
  error: string;
};

export function isDuplicateEmailSignupError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const err = error as { message?: string; status?: number; code?: string };
  const message = String(err.message || "").toLowerCase();

  return (
    err.status === 422 ||
    err.code === "email_exists" ||
    message.includes("already been registered") ||
    message.includes("already registered") ||
    message.includes("user already registered")
  );
}

export function duplicateEmailFailure(): CheckoutRegisterFailure {
  return {
    ok: false,
    status: 400,
    error: DUPLICATE_EMAIL_ERROR,
  };
}

export type CheckoutRegisterResult = { ok: true; paymentUrl: string } | CheckoutRegisterFailure;

type CheckoutAmountResult = { ok: true; finalAmount: number } | CheckoutRegisterFailure;

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

export function normalizeAffiliateCodeInput(code: string): string {
  return code.trim().toUpperCase();
}

export function resolveValidatedTestEventCode(params: {
  testEventCode?: string | null;
  testSecret?: string | null;
  metaTestModeSecret?: string | null;
}): string | undefined {
  const { testEventCode, testSecret, metaTestModeSecret } = params;
  if (testEventCode && metaTestModeSecret && testSecret === metaTestModeSecret) {
    return testEventCode;
  }
  return undefined;
}

export function applyCouponDiscount(baseAmount: number, coupon: CouponRecord): number {
  if (coupon.discount_type === "nominal") {
    return Math.max(0, baseAmount - Number(coupon.discount_value));
  }
  if (coupon.discount_type === "percentage") {
    const discount = Math.floor(baseAmount * (Number(coupon.discount_value) / 100));
    return Math.max(0, baseAmount - discount);
  }
  return baseAmount;
}

export function enforceMinimumPaidAmount(finalAmount: number): number {
  if (finalAmount > 0 && finalAmount < MIN_PAID_CHECKOUT_AMOUNT) {
    return MIN_PAID_CHECKOUT_AMOUNT;
  }
  return finalAmount;
}

export function buildCheckoutMetaAttribution(params: {
  leadEventId?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  clientIp: string;
  clientUa: string;
  hashedEmail: string | null;
  hashedPhone: string | null;
  validatedTestEventCode?: string;
}) {
  return {
    lead_event_id: params.leadEventId || null,
    fbp: params.fbp || null,
    fbc: params.fbc || null,
    client_ip_address: params.clientIp || null,
    client_user_agent: params.clientUa || null,
    hashed_email: params.hashedEmail || null,
    hashed_phone: params.hashedPhone || null,
    meta_test_event_code: params.validatedTestEventCode || null,
  };
}

async function validateAffiliateCode(
  supabaseAdmin: SupabaseClient,
  affiliateCode?: string | null,
): Promise<string | null> {
  const normalizedAffiliateCode = affiliateCode ? normalizeAffiliateCodeInput(affiliateCode) : null;
  if (!normalizedAffiliateCode) return null;

  const { data: aff } = await supabaseAdmin
    .from("affiliates")
    .select("code")
    .eq("code", normalizedAffiliateCode)
    .eq("is_active", true)
    .maybeSingle();

  logInfo(`--> Affiliate code '${normalizedAffiliateCode}' validated: ${!!aff}`);
  return aff ? aff.code : null;
}

async function resolveFinalAmount(
  supabaseAdmin: SupabaseClient,
  couponCode?: string | null,
): Promise<CheckoutAmountResult> {
  let finalAmount = BASE_CHECKOUT_AMOUNT;

  if (!couponCode) {
    return { ok: true, finalAmount: enforceMinimumPaidAmount(finalAmount) };
  }

  const normalizedCode = normalizeCouponCode(couponCode);
  logInfo(`--> Validating coupon: ${normalizedCode}`);

  const { data: coupon, error: couponErr } = await supabaseAdmin
    .from("coupons")
    .select("*")
    .eq("code", normalizedCode)
    .eq("is_active", true)
    .maybeSingle();

  if (couponErr) {
    logError("Error fetching coupon:", couponErr);
    return {
      ok: false,
      status: 500,
      error: "Terjadi kesalahan saat memvalidasi kupon. Silakan coba lagi.",
    };
  }

  if (!coupon) {
    return { ok: false, status: 400, error: "Kode kupon tidak valid atau sudah tidak aktif." };
  }

  finalAmount = applyCouponDiscount(finalAmount, coupon);
  logInfo(`--> Coupon applied. New amount: ${finalAmount}`);
  return { ok: true, finalAmount: enforceMinimumPaidAmount(finalAmount) };
}

function scheduleRegistrationAutoresponder(params: {
  c: BindingsContext;
  eventKey: "registration_completed" | "payment_completed";
  whatsapp: string;
  name: string;
  idempotencyKey: string;
  templateContext: Record<string, string>;
  metadata: Record<string, unknown>;
}) {
  const autoresponderPromise = sendWhatsappAutoresponder({
    c: params.c,
    eventKey: params.eventKey,
    recipientWhatsapp: params.whatsapp,
    recipientName: params.name,
    idempotencyKey: params.idempotencyKey,
    templateContext: params.templateContext,
    metadata: params.metadata,
  }).catch((err) => {
    const label =
      params.eventKey === "payment_completed"
        ? "Free Bypass WhatsApp autoresponder failed:"
        : "Registration WhatsApp autoresponder failed:";
    logError(label, err);
  });

  try {
    params.c.executionCtx.waitUntil(autoresponderPromise);
  } catch (_) {
    // Fallback for non-Cloudflare environments
  }
}

async function processFreeBypassCheckout(params: {
  c: BindingsContext;
  supabaseAdmin: SupabaseClient;
  name: string;
  email: string;
  whatsapp: string;
  password: string;
  couponCode?: string | null;
  validatedAffiliateCode: string | null;
  metaAttribution: ReturnType<typeof buildCheckoutMetaAttribution>;
  validatedTestEventCode?: string;
  hashedEmail: string | null;
  hashedPhone: string | null;
  clientIp: string;
  clientUa: string;
  fbp?: string | null;
  fbc?: string | null;
}): Promise<CheckoutRegisterResult> {
  const {
    c,
    supabaseAdmin,
    name,
    email,
    whatsapp,
    password,
    couponCode,
    validatedAffiliateCode,
    metaAttribution,
    validatedTestEventCode,
    hashedEmail,
    hashedPhone,
    clientIp,
    clientUa,
    fbp,
    fbc,
  } = params;

  logInfo("--> 100% Free Coupon applied! Bypassing Mayar...");

  const normalizedEmail = email.toLowerCase();
  const normalizedCouponCode = couponCode ? normalizeCouponCode(couponCode) : null;

  const { data: authData, error: signupErr } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: { name, whatsapp },
    app_metadata: { siklusio_access_status: "active" },
  });

  if (signupErr) {
    logError("Supabase auth user creation error:", signupErr);
    if (isDuplicateEmailSignupError(signupErr)) {
      return duplicateEmailFailure();
    }
    return { ok: false, status: 500, error: "Gagal membuat akun: " + signupErr.message };
  }

  const { data: session } = await supabaseAdmin
    .from("checkout_sessions")
    .insert({
      email: normalizedEmail,
      name,
      whatsapp,
      coupon_code: normalizedCouponCode,
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
      email: normalizedEmail,
      whatsapp,
      source: "free_bypass_checkout",
      referralCode: normalizedCouponCode,
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
        buyer_email: normalizedEmail,
        buyer_whatsapp: whatsapp,
        amount_paid: 0,
        commission_amount: commissionAmount,
        mayar_transaction_id: null,
      });
      logInfo(`--> Affiliate conversion recorded (free bypass, commission: ${commissionAmount})`);
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
        validatedTestEventCode,
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

  scheduleRegistrationAutoresponder({
    c,
    eventKey: "payment_completed",
    whatsapp,
    name,
    idempotencyKey: `wa:payment_completed:free_bypass:${session.id}`,
    templateContext: {
      nama: name,
      email: normalizedEmail,
      no_hp: whatsapp,
      link_pembayaran: "-",
      jumlah_pembayaran: "Rp 0",
      status_pembayaran: "Gratis (Kupon 100%)",
      kode_kupon: normalizedCouponCode || "-",
      kode_affiliate: validatedAffiliateCode || "-",
      link_login: "https://app.siklusio.web.id/auth",
      tanggal: new Date().toLocaleDateString("id-ID"),
      transaction_id: session.id,
    },
    metadata: {
      checkout_session_id: session.id,
      source: "free_bypass",
    },
  });

  logInfo("<-- Free Checkout successful! User ID:", authData.user?.id);
  return { ok: true, paymentUrl: "https://app.siklusio.web.id/auth?status=success_free" };
}

async function processPaidCheckoutRegistration(params: {
  c: BindingsContext;
  supabaseAdmin: SupabaseClient;
  mayarKey: string;
  name: string;
  email: string;
  whatsapp: string;
  password: string;
  couponCode?: string | null;
  validatedAffiliateCode: string | null;
  finalAmount: number;
  metaAttribution: ReturnType<typeof buildCheckoutMetaAttribution>;
}): Promise<CheckoutRegisterResult> {
  const {
    c,
    supabaseAdmin,
    mayarKey,
    name,
    email,
    whatsapp,
    password,
    couponCode,
    validatedAffiliateCode,
    finalAmount,
    metaAttribution,
  } = params;

  const normalizedEmail = email.toLowerCase();
  const normalizedCouponCode = couponCode ? normalizeCouponCode(couponCode) : null;

  logInfo("--> Creating Supabase Auth user immediately as pending...");
  const { data: authData, error: signupErr } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: { name, whatsapp },
    app_metadata: { siklusio_access_status: "pending_payment" },
  });

  if (signupErr) {
    logError("Supabase auth user creation error:", signupErr);
    if (isDuplicateEmailSignupError(signupErr)) {
      return duplicateEmailFailure();
    }
    return { ok: false, status: 500, error: "Gagal membuat akun: " + signupErr.message };
  }

  const userId = authData.user.id;

  logInfo("--> Inserting pending registration...");
  const { data: pendingRow, error: insertErr } = await supabaseAdmin
    .from("pending_registrations")
    .upsert(
      {
        email: normalizedEmail,
        user_id: userId,
        name,
        whatsapp,
        coupon_code: normalizedCouponCode,
        affiliate_code: validatedAffiliateCode,
      },
      { onConflict: "email" },
    )
    .select("id")
    .maybeSingle();

  if (insertErr) {
    logError("DB Insert pending registration error:", insertErr);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return {
      ok: false,
      status: 500,
      error: "Gagal menyimpan pendaftaran tertunda. Silakan coba kembali.",
    };
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
      email: normalizedEmail,
      mobile: whatsapp,
    });
    paymentUrl = result.link;
    mayarTxId = result.id;
  } catch (payErr: any) {
    logError("Mayar API error:", payErr);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    await supabaseAdmin.from("pending_registrations").delete().eq("email", normalizedEmail);
    return { ok: false, status: 500, error: "Gagal membuat link pembayaran. Hubungi admin." };
  }

  const { error: sessionErr } = await supabaseAdmin.from("checkout_sessions").insert({
    email: normalizedEmail,
    name,
    whatsapp,
    coupon_code: normalizedCouponCode,
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
    await supabaseAdmin.from("pending_registrations").delete().eq("email", normalizedEmail);
    return {
      ok: false,
      status: 500,
      error: "Gagal mencatat sesi pembayaran. Silakan coba kembali.",
    };
  }

  try {
    await upsertAdminCrmLead(supabaseAdmin, {
      userId,
      pendingRegistrationId: pendingRow?.id || null,
      name,
      email: normalizedEmail,
      whatsapp,
      source: "checkout_register",
      referralCode: normalizedCouponCode,
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

  scheduleRegistrationAutoresponder({
    c,
    eventKey: "registration_completed",
    whatsapp,
    name,
    idempotencyKey: `wa:registration_completed:${mayarTxId || normalizedEmail}`,
    templateContext: {
      nama: name,
      email: normalizedEmail,
      no_hp: whatsapp,
      link_pembayaran: paymentUrl,
      jumlah_pembayaran: `Rp ${finalAmount.toLocaleString("id-ID")}`,
      status_pembayaran: "Menunggu Pembayaran",
      kode_kupon: normalizedCouponCode || "-",
      kode_affiliate: validatedAffiliateCode || "-",
      link_login: "https://app.siklusio.web.id/auth",
      tanggal: new Date().toLocaleDateString("id-ID"),
      transaction_id: mayarTxId || "-",
    },
    metadata: {
      checkout_session_status: "pending",
      mayar_transaction_id: mayarTxId,
      email: normalizedEmail,
    },
  });

  logInfo("<-- Checkout request successful! Payment URL:", paymentUrl);
  return { ok: true, paymentUrl };
}

export async function processCheckoutRegistration(params: {
  c: BindingsContext;
  input: CheckoutRegisterInput;
  clientIp: string;
  clientUa: string;
}): Promise<CheckoutRegisterResult> {
  const { c, input, clientIp, clientUa } = params;
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
  } = input;

  if (!name || !email || !whatsapp || !password) {
    return { ok: false, status: 400, error: "Semua formulir pendaftaran wajib diisi." };
  }

  const supabaseAdmin = getSupabaseAdmin(c);

  const validatedTestEventCode = resolveValidatedTestEventCode({
    testEventCode: test_event_code,
    testSecret: test_secret,
    metaTestModeSecret: c.env.META_TEST_MODE_SECRET,
  });

  const hashedEmail = await hashData(email);
  const hashedPhone = await hashData(formatE164Phone(whatsapp));

  const mayarKey = c.env.MAYAR_API_KEY;
  if (!mayarKey) {
    logError("MAYAR_API_KEY secret is not configured");
    return {
      ok: false,
      status: 500,
      error: "Konfigurasi pembayaran belum tersedia. Hubungi admin.",
    };
  }

  const amountResult = await resolveFinalAmount(supabaseAdmin, couponCode);
  if (amountResult.ok === false) return amountResult;

  const finalAmount = amountResult.finalAmount;
  const validatedAffiliateCode = await validateAffiliateCode(supabaseAdmin, affiliateCode);

  const metaAttribution = buildCheckoutMetaAttribution({
    leadEventId: lead_event_id,
    fbp,
    fbc,
    clientIp,
    clientUa,
    hashedEmail,
    hashedPhone,
    validatedTestEventCode,
  });

  if (finalAmount === 0) {
    return processFreeBypassCheckout({
      c,
      supabaseAdmin,
      name,
      email,
      whatsapp,
      password,
      couponCode,
      validatedAffiliateCode,
      metaAttribution,
      validatedTestEventCode,
      hashedEmail,
      hashedPhone,
      clientIp,
      clientUa,
      fbp,
      fbc,
    });
  }

  return processPaidCheckoutRegistration({
    c,
    supabaseAdmin,
    mayarKey,
    name,
    email,
    whatsapp,
    password,
    couponCode,
    validatedAffiliateCode,
    finalAmount,
    metaAttribution,
  });
}
