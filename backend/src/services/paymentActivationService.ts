import type { SupabaseClient } from "@supabase/supabase-js";
import type { BindingsContext } from "../middlewares/auth";
import { upsertAdminCrmLead } from "./adminCrm";
import {
  recordAdminManualAffiliateConversion,
  recordWebhookAffiliateConversion,
} from "./affiliateConversionService";
import {
  grantAdminManualPremiumEntitlement,
  grantWebhookPremiumEntitlement,
} from "./premiumEntitlementService";
import {
  scheduleMayarWebhookPaymentAutoresponder,
  sendWebhookPurchaseMetaCapi,
} from "./paymentNotificationService";
import { logInfo, logError } from "../logging/redaction";

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

export type AdminManualActivationResult = {
  paymentOverrideCreated: boolean;
  userActivated: boolean;
  creditsGranted: boolean;
  affiliateConversionCreated: boolean;
  checkoutSessionUpdated: boolean;
  pendingRegistrationCleaned: boolean;
  warnings: string[];
};

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

  const entitlement = await grantWebhookPremiumEntitlement({
    supabaseAdmin,
    pendingUserId: pending.user_id,
    creditReferenceId: session?.id || null,
  });

  try {
    await upsertAdminCrmLead(supabaseAdmin, {
      userId: entitlement.userId || pending.user_id || null,
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
      buyer: {
        name: pending.name,
        email: pending.email,
        whatsapp: pending.whatsapp,
      },
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

  return { userId: entitlement.userId };
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

  const entitlement = await grantAdminManualPremiumEntitlement({
    supabaseAdmin,
    authUserId: pending?.user_id || lead.user_id || null,
    email,
  });

  activationResult.warnings.push(...entitlement.warnings);
  activationResult.userActivated = entitlement.userActivated;
  activationResult.creditsGranted = entitlement.creditsGranted;

  if (!entitlement.activatedUserId) {
    return { activatedUserId: null };
  }

  const finalActivatedUserId = entitlement.activatedUserId;

  const affiliateCode = pending?.affiliate_code || lead.affiliate_code;
  if (affiliateCode) {
    const affiliateResult = await recordAdminManualAffiliateConversion({
      supabaseAdmin,
      affiliateCode,
      email,
      buyerName: pending?.name || lead.name || "User",
      buyerWhatsapp: pending?.whatsapp || lead.whatsapp || "-",
      amount,
    });

    activationResult.warnings.push(...affiliateResult.warnings);
    if (affiliateResult.created) {
      activationResult.affiliateConversionCreated = true;
    }

    const session = affiliateResult.pendingCheckoutSession;
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