import type { SupabaseClient } from "@supabase/supabase-js";
import type { BindingsContext } from "../middlewares/auth";
import { grantPremiumInitialAiCredits } from "./aiCreditLedger";
import { upsertAdminCrmLead } from "./adminCrm";
import { hashData, formatE164Phone, sendMetaCapiEvent } from "./metaCapi";
import { sendWhatsappAutoresponder } from "./fonnte";
import { logInfo, logWarn, logError } from "../logging/redaction";

export type CheckoutSessionSnapshot = {
  id: string;
  email?: string | null;
  whatsapp?: string | null;
  name?: string | null;
  final_amount?: number | null;
  mayar_transaction_id?: string | null;
  mayar_link?: string | null;
  coupon_code?: string | null;
  affiliate_code?: string | null;
  hashed_email?: string | null;
  hashed_phone?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  client_ip_address?: string | null;
  client_user_agent?: string | null;
  meta_test_event_code?: string | null;
  purchase_capi_sent_at?: string | null;
  purchase_capi_event_id?: string | null;
  status?: string | null;
};

export type PendingRegistrationSnapshot = {
  id: string;
  user_id: string;
  email: string;
  name?: string | null;
  whatsapp?: string | null;
  affiliate_code?: string | null;
  coupon_code?: string | null;
};

export type AffiliateRecord = {
  id: string;
  commission_type: string;
  commission_value: number;
  allow_zero_order_commission?: boolean | null;
};

export type AdminManualActivationResult = {
  paymentOverrideCreated: boolean;
  userActivated: boolean;
  creditsGranted: boolean;
  affiliateConversionCreated: boolean;
  checkoutSessionUpdated: boolean;
  pendingRegistrationCleaned: boolean;
  warnings: string[];
};

export function calculateAffiliateCommission(
  amountPaid: number,
  affiliate: AffiliateRecord,
): number {
  if (Number(amountPaid) === 0 && !affiliate.allow_zero_order_commission) {
    return 0;
  }
  if (affiliate.commission_type === "percentage") {
    return Math.floor(Number(amountPaid) * (Number(affiliate.commission_value) / 100));
  }
  return Number(affiliate.commission_value);
}

export async function hasAffiliateConversionForTransaction(
  supabaseAdmin: SupabaseClient,
  mayarTransactionId: string,
): Promise<boolean> {
  const { data: existingConversion } = await supabaseAdmin
    .from("affiliate_conversions")
    .select("id")
    .eq("mayar_transaction_id", mayarTransactionId)
    .maybeSingle();

  return Boolean(existingConversion);
}

export async function activatePendingAuthUser(
  supabaseAdmin: SupabaseClient,
  pendingUserId: string,
) {
  const { data: authData, error: signupErr } = await supabaseAdmin.auth.admin.updateUserById(
    pendingUserId,
    {
      app_metadata: {
        siklusio_access_status: "active",
      },
    },
  );

  if (signupErr) throw signupErr;
  return authData.user;
}

export async function grantPremiumCreditsForActivation(
  supabaseAdmin: SupabaseClient,
  userId: string,
  referenceId?: string | null,
) {
  return grantPremiumInitialAiCredits({
    supabaseAdmin,
    userId,
    referenceId: referenceId || null,
  });
}

export async function recordWebhookAffiliateConversion(params: {
  supabaseAdmin: SupabaseClient;
  affiliateCode: string;
  pending: PendingRegistrationSnapshot;
  session: CheckoutSessionSnapshot | null;
  mayarTransactionId: string | null;
  fallbackAmount?: number | null;
}) {
  const { supabaseAdmin, affiliateCode, pending, session, mayarTransactionId, fallbackAmount } =
    params;

  logInfo(`--> Processing affiliate conversion for code: ${affiliateCode}`);

  const { data: affiliate } = await supabaseAdmin
    .from("affiliates")
    .select("id, commission_type, commission_value, allow_zero_order_commission")
    .eq("code", affiliateCode)
    .eq("is_active", true)
    .maybeSingle();

  if (!affiliate) return { created: false };

  const amountPaid = session?.final_amount || fallbackAmount || 0;
  const commissionAmount = calculateAffiliateCommission(Number(amountPaid), affiliate);

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
      logInfo(`--> Affiliate conversion already exists for tx ${mayarTransactionId} (idempotent)`);
      return { created: false, duplicate: true };
    }
    logError("Error inserting affiliate conversion:", convErr);
    return { created: false, error: convErr };
  }

  logInfo(`--> Affiliate conversion recorded: commission Rp ${commissionAmount}`);
  return { created: true, commissionAmount };
}

export async function markCheckoutSessionPaid(
  supabaseAdmin: SupabaseClient,
  session: CheckoutSessionSnapshot,
  mayarTransactionId?: string | null,
) {
  await supabaseAdmin
    .from("checkout_sessions")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      mayar_transaction_id: session.mayar_transaction_id || mayarTransactionId || null,
    })
    .eq("id", session.id);
}

export async function deletePendingRegistration(
  supabaseAdmin: SupabaseClient,
  pendingId: string,
) {
  logInfo("--> Deleting pending registration record");
  await supabaseAdmin.from("pending_registrations").delete().eq("id", pendingId);
}

export async function sendWebhookPurchaseMetaCapi(params: {
  c: BindingsContext;
  supabaseAdmin: SupabaseClient;
  session: CheckoutSessionSnapshot | null;
  email: string;
  pending: PendingRegistrationSnapshot;
  mayarTransactionId: string | null;
  fallbackAmount?: number | null;
}) {
  const { c, supabaseAdmin, session, email, pending, mayarTransactionId, fallbackAmount } = params;

  const eventId = `purchase_${mayarTransactionId || (session ? session.id : "missing_tx")}`;
  const userData = {
    em: session?.hashed_email ? [session.hashed_email] : [await hashData(email)],
    ph: session?.hashed_phone
      ? [session.hashed_phone]
      : pending.whatsapp
        ? [await hashData(formatE164Phone(pending.whatsapp))]
        : undefined,
    fbp: session?.fbp || undefined,
    fbc: session?.fbc || undefined,
    client_ip_address: session?.client_ip_address || undefined,
    client_user_agent: session?.client_user_agent || undefined,
  };
  const customData = {
    currency: "IDR",
    value: Number(session?.final_amount) || Number(fallbackAmount) || 37000,
    content_name: "Siklusio Premium Lifetime",
    content_type: "product",
    content_ids: ["siklusio_premium_lifetime"],
    num_items: 1,
    order_id: mayarTransactionId || (session ? session.id : undefined),
  };

  let capiSuccess = false;
  if (c.env.META_PIXEL_ID && c.env.META_CAPI_ACCESS_TOKEN) {
    const res = await sendMetaCapiEvent(
      c,
      "Purchase",
      eventId,
      userData,
      customData,
      session?.meta_test_event_code || undefined,
    );
    capiSuccess = res.ok;
  } else {
    logWarn("--> Meta env variables missing. Skipping CAPI but marking done.");
    capiSuccess = true;
  }

  if (capiSuccess && session) {
    await supabaseAdmin
      .from("checkout_sessions")
      .update({
        purchase_capi_sent_at: new Date().toISOString(),
        purchase_capi_event_id: eventId,
      })
      .eq("id", session.id);
  }

  return { capiSuccess, eventId };
}

export async function retryPaidSessionPurchaseMetaCapi(params: {
  c: BindingsContext;
  supabaseAdmin: SupabaseClient;
  session: CheckoutSessionSnapshot;
  mayarTransactionId: string | null;
}) {
  const { c, supabaseAdmin, session, mayarTransactionId } = params;

  logInfo(
    `--> Webhook recovery: checkout_session ${session.id} is paid but CAPI not sent yet. Retrying CAPI...`,
  );

  const eventId = `purchase_${mayarTransactionId || session.mayar_transaction_id || session.id}`;
  const userData = {
    em: session.hashed_email ? [session.hashed_email] : undefined,
    ph: session.hashed_phone ? [session.hashed_phone] : undefined,
    fbp: session.fbp || undefined,
    fbc: session.fbc || undefined,
    client_ip_address: session.client_ip_address || undefined,
    client_user_agent: session.client_user_agent || undefined,
  };
  const customData = {
    currency: "IDR",
    value: Number(session.final_amount),
    content_name: "Siklusio Premium Lifetime",
    content_type: "product",
    content_ids: ["siklusio_premium_lifetime"],
    num_items: 1,
    order_id: mayarTransactionId || session.mayar_transaction_id,
  };

  let capiSuccess = false;
  if (c.env.META_PIXEL_ID && c.env.META_CAPI_ACCESS_TOKEN) {
    const res = await sendMetaCapiEvent(
      c,
      "Purchase",
      eventId,
      userData,
      customData,
      session.meta_test_event_code || undefined,
    );
    capiSuccess = res.ok;
  } else {
    logWarn("--> Meta env variables missing. Skipping CAPI retry.");
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

  return { capiSuccess, eventId };
}

export function scheduleMayarWebhookPaymentAutoresponder(params: {
  c: BindingsContext;
  session: CheckoutSessionSnapshot | null;
  pending: PendingRegistrationSnapshot;
  mayarTransactionId: string | null;
  fallbackAmount?: number | null;
}) {
  const { c, session, pending, mayarTransactionId, fallbackAmount } = params;

  const autoresponderPromise = sendWhatsappAutoresponder({
    c,
    eventKey: "payment_completed",
    recipientWhatsapp: session?.whatsapp || pending.whatsapp,
    recipientName: session?.name || pending.name,
    idempotencyKey: `wa:payment_completed:${session?.mayar_transaction_id || mayarTransactionId || session?.id || pending.id}`,
    templateContext: {
      nama: session?.name || pending.name || "Bunda",
      email: session?.email || pending.email || "-",
      no_hp: session?.whatsapp || pending.whatsapp || "-",
      link_pembayaran: session?.mayar_link || "-",
      jumlah_pembayaran: `Rp ${Number(session?.final_amount || fallbackAmount || 0).toLocaleString("id-ID")}`,
      status_pembayaran: "Berhasil",
      kode_kupon: session?.coupon_code || pending.coupon_code || "-",
      kode_affiliate: session?.affiliate_code || pending.affiliate_code || "-",
      link_login: "https://app.siklusio.web.id/auth",
      tanggal: new Date().toLocaleDateString("id-ID"),
      transaction_id: session?.mayar_transaction_id || mayarTransactionId || "-",
    },
    metadata: {
      checkout_session_id: session?.id || null,
      mayar_transaction_id: session?.mayar_transaction_id || mayarTransactionId || null,
      source: "mayar_webhook",
    },
  }).catch((err) => {
    logError("Webhook Payment completed WhatsApp autoresponder failed:", err);
  });

  try {
    c.executionCtx.waitUntil(autoresponderPromise);
  } catch (_) {
    // Fallback for environments without Cloudflare execution context
  }
}

export async function processMayarWebhookPremiumActivation(params: {
  c: BindingsContext;
  supabaseAdmin: SupabaseClient;
  pending: PendingRegistrationSnapshot;
  session: CheckoutSessionSnapshot | null;
  mayarTransactionId: string | null;
  email: string;
  fallbackAmount?: number | null;
}) {
  const { c, supabaseAdmin, pending, session, mayarTransactionId, email, fallbackAmount } = params;

  logInfo("--> Activating existing pending Supabase Auth user:", pending.user_id);
  const authUser = await activatePendingAuthUser(supabaseAdmin, pending.user_id);

  if (authUser?.id) {
    await grantPremiumCreditsForActivation(supabaseAdmin, authUser.id, session?.id || null);
  }

  try {
    await upsertAdminCrmLead(supabaseAdmin, {
      userId: authUser?.id || pending.user_id || null,
      pendingRegistrationId: pending.id,
      name: pending.name,
      email: pending.email,
      whatsapp: pending.whatsapp,
      source: "mayar_webhook",
      referralCode: pending.coupon_code || null,
      affiliateCode: pending.affiliate_code || null,
      leadStatus: "paid",
      paymentStatus: "paid",
      mayarTransactionId,
      amount: fallbackAmount != null ? Number(fallbackAmount) : null,
    });
  } catch (crmErr) {
    logError("CRM upsert failed during Mayar webhook processing:", crmErr);
  }

  if (pending.affiliate_code) {
    await recordWebhookAffiliateConversion({
      supabaseAdmin,
      affiliateCode: pending.affiliate_code,
      pending,
      session,
      mayarTransactionId,
      fallbackAmount,
    });
  }

  if (session) {
    await markCheckoutSessionPaid(supabaseAdmin, session, mayarTransactionId);
  }

  await sendWebhookPurchaseMetaCapi({
    c,
    supabaseAdmin,
    session,
    email,
    pending,
    mayarTransactionId,
    fallbackAmount,
  });

  await deletePendingRegistration(supabaseAdmin, pending.id);
  scheduleMayarWebhookPaymentAutoresponder({
    c,
    session,
    pending,
    mayarTransactionId,
    fallbackAmount,
  });

  return { userId: authUser?.id || null };
}

async function resolveAuthUserForManualActivation(
  supabaseAdmin: SupabaseClient,
  params: {
    authUserId?: string | null;
    email: string;
  },
) {
  let authUser: any = null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (params.authUserId && uuidRegex.test(params.authUserId)) {
    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(params.authUserId);
    authUser = authData?.user;
  }

  if (!authUser && params.email) {
    const { data: userList, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) {
      logError("Failed to list users in override:", listErr);
    }
    authUser = userList?.users.find((u: any) => u.email?.toLowerCase() === params.email);
  }

  return authUser;
}

export async function processAdminManualPremiumActivation(params: {
  supabaseAdmin: SupabaseClient;
  pending: PendingRegistrationSnapshot | null;
  lead: {
    id: string;
    name?: string | null;
    email?: string | null;
    whatsapp?: string | null;
    affiliate_code?: string | null;
    user_id?: string | null;
  };
  email: string;
  amount?: number | null;
  activationResult: AdminManualActivationResult;
}) {
  const { supabaseAdmin, pending, lead, email, amount, activationResult } = params;

  let finalActivatedUserId: string | null = null;
  const authUserId = pending?.user_id || lead.user_id || null;
  const authUser = await resolveAuthUserForManualActivation(supabaseAdmin, {
    authUserId,
    email,
  });

  if (!authUser) {
    activationResult.warnings.push(
      "CRM status berhasil diubah, namun aktivasi user dilewati karena user terdaftar (auth) tidak ditemukan.",
    );
    return { activatedUserId: null };
  }

  finalActivatedUserId = authUser.id;
  const currentAccessStatus = authUser.app_metadata?.siklusio_access_status;
  if (currentAccessStatus === "active") {
    activationResult.warnings.push("User auth sudah dalam keadaan aktif.");
  } else {
    const { error: activeErr } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
      app_metadata: {
        ...(authUser.app_metadata || {}),
        siklusio_access_status: "active",
      },
    });
    if (activeErr) throw activeErr;
    activationResult.userActivated = true;
  }

  const { data: premiumSession } = await supabaseAdmin
    .from("checkout_sessions")
    .select("id")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const creditsResult = await grantPremiumCreditsForActivation(
    supabaseAdmin,
    authUser.id,
    premiumSession?.id || null,
  );

  if (creditsResult !== null) {
    activationResult.creditsGranted = true;
  } else {
    activationResult.warnings.push("Kredit premium awal (500) sudah pernah diberikan sebelumnya.");
  }

  const affiliateCode = pending?.affiliate_code || lead.affiliate_code;
  if (affiliateCode) {
    const normalizedCode = affiliateCode.trim().toUpperCase();
    const { data: session } = await supabaseAdmin
      .from("checkout_sessions")
      .select("*")
      .eq("email", email)
      .eq("affiliate_code", normalizedCode)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: affiliate } = await supabaseAdmin
      .from("affiliates")
      .select("id, commission_type, commission_value, allow_zero_order_commission")
      .eq("code", normalizedCode)
      .eq("is_active", true)
      .maybeSingle();

    if (affiliate) {
      const amountPaid = session?.final_amount || amount || 0;
      const commissionAmount = calculateAffiliateCommission(Number(amountPaid), affiliate);

      const { data: existingConv } = await supabaseAdmin
        .from("affiliate_conversions")
        .select("id")
        .eq("affiliate_id", affiliate.id)
        .eq("buyer_email", email)
        .maybeSingle();

      if (existingConv) {
        activationResult.warnings.push("Konversi afiliasi untuk transaksi ini sudah tercatat.");
      } else {
        const { error: convErr } = await supabaseAdmin.from("affiliate_conversions").insert({
          affiliate_id: affiliate.id,
          checkout_session_id: session?.id || null,
          buyer_name: pending?.name || lead.name || "User",
          buyer_email: email,
          buyer_whatsapp: pending?.whatsapp || lead.whatsapp || "-",
          amount_paid: Number(amountPaid),
          commission_amount: commissionAmount,
          mayar_transaction_id: session?.mayar_transaction_id || null,
        });

        if (convErr) {
          if (convErr.code === "23505") {
            activationResult.warnings.push("Konversi afiliasi sudah terdaftar (23505).");
          } else {
            logError("Error inserting affiliate conversion in manual override:", convErr);
          }
        } else {
          activationResult.affiliateConversionCreated = true;
        }
      }
    }

    if (session) {
      const { error: sessUpdateErr } = await supabaseAdmin
        .from("checkout_sessions")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", session.id);

      if (sessUpdateErr) {
        logError("Failed to update checkout session in override:", sessUpdateErr);
      } else {
        activationResult.checkoutSessionUpdated = true;
      }
    }
  }

  if (pending) {
    const { error: delErr } = await supabaseAdmin
      .from("pending_registrations")
      .delete()
      .eq("id", pending.id);

    if (delErr) {
      logError("Failed to clean pending registration in override:", delErr);
    } else {
      activationResult.pendingRegistrationCleaned = true;
    }
  }

  return { activatedUserId: finalActivatedUserId };
}

export function scheduleAdminManualPaymentAutoresponder(params: {
  c: BindingsContext;
  lead: {
    id: string;
    name?: string | null;
    email?: string | null;
    whatsapp?: string | null;
    affiliate_code?: string | null;
  };
  overrideId: string;
  finalReference?: string | null;
  amount?: number | null;
}) {
  const { c, lead, overrideId, finalReference, amount } = params;

  const autoresponderPromise = sendWhatsappAutoresponder({
    c,
    eventKey: "payment_completed",
    recipientWhatsapp: lead.whatsapp,
    recipientName: lead.name,
    idempotencyKey: `wa:payment_completed:manual:${lead.id}:${finalReference || overrideId}`,
    templateContext: {
      nama: lead.name || "Bunda",
      email: lead.email || "-",
      no_hp: lead.whatsapp || "-",
      link_pembayaran: "-",
      jumlah_pembayaran: amount ? `Rp ${Number(amount).toLocaleString("id-ID")}` : "-",
      status_pembayaran: "Berhasil Manual",
      kode_kupon: "-",
      kode_affiliate: lead.affiliate_code || "-",
      link_login: "https://app.siklusio.web.id/auth",
      tanggal: new Date().toLocaleDateString("id-ID"),
      transaction_id: finalReference || overrideId,
    },
    metadata: {
      source: "admin_manual_payment_override",
      lead_id: lead.id,
      override_id: overrideId,
    },
  }).catch((err) => {
    logError("CRM Manual Payment WhatsApp autoresponder failed:", err);
  });

  try {
    c.executionCtx.waitUntil(autoresponderPromise);
  } catch (_) {
    // Fallback for non-Cloudflare environments (e.g. testing)
  }
}