import type { SupabaseClient } from "@supabase/supabase-js";
import type { BindingsContext } from "../middlewares/auth";
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
import {
  cleanupAdminManualPendingRegistration,
  deleteWebhookPendingRegistration,
  markAdminManualCheckoutSessionPaid,
  markCheckoutSessionPaid,
  syncWebhookPaymentCrmLead,
} from "./paymentFinalizationService";

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

  await syncWebhookPaymentCrmLead(supabaseAdmin, {
    userId: entitlement.userId,
    pending,
    mayarTransactionId,
    fallbackAmount,
  });

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

  await deleteWebhookPendingRegistration(supabaseAdmin, pending.id);
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
      const sessionResult = await markAdminManualCheckoutSessionPaid(supabaseAdmin, session.id);
      if (sessionResult.updated) {
        activationResult.checkoutSessionUpdated = true;
      }
    }
  }

  if (pending) {
    const cleanupResult = await cleanupAdminManualPendingRegistration(supabaseAdmin, pending.id);
    if (cleanupResult.cleaned) {
      activationResult.pendingRegistrationCleaned = true;
    }
  }

  return { activatedUserId: finalActivatedUserId };
}