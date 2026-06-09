import type { SupabaseClient } from "@supabase/supabase-js";
import { upsertAdminCrmLead } from "./adminCrm";
import { logInfo, logError } from "../logging/redaction";

export type FinalizationCheckoutSession = {
  id: string;
  mayar_transaction_id?: string | null;
};

export type FinalizationPendingRegistration = {
  id: string;
  user_id: string;
  email: string;
  name?: string | null;
  whatsapp?: string | null;
  affiliate_code?: string | null;
  coupon_code?: string | null;
};

export async function markCheckoutSessionPaid(
  supabaseAdmin: SupabaseClient,
  session: FinalizationCheckoutSession,
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

export async function markAdminManualCheckoutSessionPaid(
  supabaseAdmin: SupabaseClient,
  sessionId: string,
): Promise<{ updated: boolean }> {
  const { error: sessUpdateErr } = await supabaseAdmin
    .from("checkout_sessions")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (sessUpdateErr) {
    logError("Failed to update checkout session in override:", sessUpdateErr);
    return { updated: false };
  }

  return { updated: true };
}

export async function deleteWebhookPendingRegistration(
  supabaseAdmin: SupabaseClient,
  pendingId: string,
) {
  logInfo("--> Deleting pending registration record");
  await supabaseAdmin.from("pending_registrations").delete().eq("id", pendingId);
}

export async function cleanupAdminManualPendingRegistration(
  supabaseAdmin: SupabaseClient,
  pendingId: string,
): Promise<{ cleaned: boolean }> {
  const { error: delErr } = await supabaseAdmin
    .from("pending_registrations")
    .delete()
    .eq("id", pendingId);

  if (delErr) {
    logError("Failed to clean pending registration in override:", delErr);
    return { cleaned: false };
  }

  return { cleaned: true };
}

export async function syncWebhookPaymentCrmLead(
  supabaseAdmin: SupabaseClient,
  params: {
    userId: string | null;
    pending: FinalizationPendingRegistration;
    mayarTransactionId: string | null;
    fallbackAmount?: number | null;
  },
) {
  const { userId, pending, mayarTransactionId, fallbackAmount } = params;

  try {
    await upsertAdminCrmLead(supabaseAdmin, {
      userId: userId || pending.user_id || null,
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
}