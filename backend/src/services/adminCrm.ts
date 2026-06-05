import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminCrmLeadStatus =
  | "new_lead"
  | "contacted"
  | "interested"
  | "checkout_started"
  | "pending_payment"
  | "paid"
  | "onboarded"
  | "no_response"
  | "not_interested";

export type AdminCrmPaymentStatus =
  | "new"
  | "checkout_started"
  | "pending_payment"
  | "paid"
  | "paid_manual"
  | "failed"
  | "cancelled"
  | "refunded";

export type UpsertAdminCrmLeadInput = {
  userId?: string | null;
  pendingRegistrationId?: string | null;
  name?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  source?: string | null;
  referralCode?: string | null;
  affiliateCode?: string | null;
  leadStatus?: AdminCrmLeadStatus;
  paymentStatus?: AdminCrmPaymentStatus;
  checkoutUrl?: string | null;
  mayarPaymentId?: string | null;
  mayarTransactionId?: string | null;
  amount?: number | null;
  currency?: string | null;
};

export async function upsertAdminCrmLead(
  supabaseAdmin: SupabaseClient,
  input: UpsertAdminCrmLeadInput,
) {
  const { data, error } = await supabaseAdmin.rpc("admin_crm_upsert_lead", {
    p_user_id: input.userId || null,
    p_pending_registration_id: input.pendingRegistrationId || null,
    p_name: input.name || null,
    p_email: input.email || null,
    p_whatsapp: input.whatsapp || null,
    p_source: input.source || "checkout",
    p_referral_code: input.referralCode || null,
    p_affiliate_code: input.affiliateCode || null,
    p_lead_status: input.leadStatus || "checkout_started",
    p_payment_status: input.paymentStatus || "pending_payment",
    p_checkout_url: input.checkoutUrl || null,
    p_mayar_payment_id: input.mayarPaymentId || null,
    p_mayar_transaction_id: input.mayarTransactionId || null,
    p_amount: input.amount ?? null,
    p_currency: input.currency || "IDR",
  });

  if (error) throw error;
  return data;
}

export async function insertAdminCrmAuditLog(
  supabaseAdmin: SupabaseClient,
  input: {
    actorUserId?: string | null;
    action: string;
    targetType: string;
    targetId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await supabaseAdmin.from("admin_crm_audit_logs").insert({
    actor_user_id: input.actorUserId || null,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId || null,
    metadata: input.metadata || {},
  });

  if (error) throw error;
}
