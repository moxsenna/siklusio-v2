export type ViewMode = "list" | "kanban" | "detail";

export type PaymentStatus =
  | "new"
  | "checkout_started"
  | "pending_payment"
  | "paid"
  | "paid_manual"
  | "failed"
  | "cancelled"
  | "refunded";

export type LeadStatus =
  | "new_lead"
  | "contacted"
  | "interested"
  | "checkout_started"
  | "pending_payment"
  | "paid"
  | "onboarded"
  | "no_response"
  | "not_interested";

export type CrmLead = {
  id: string;
  user_id: string | null;
  pending_registration_id: string | null;
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  source: string;
  referral_code: string | null;
  affiliate_code: string | null;
  lead_status: LeadStatus;
  payment_status: PaymentStatus;
  checkout_url: string | null;
  mayar_payment_id: string | null;
  mayar_transaction_id: string | null;
  manual_payment_reference: string | null;
  amount: number | null;
  currency: string;
  last_contacted_at: string | null;
  next_followup_at: string | null;
  created_at: string;
  updated_at: string;
  notes?: Array<{ id: string; note: string; created_at: string; admin_user_id: string }>;
  payment_overrides?: Array<{
    id: string;
    old_payment_status: PaymentStatus | null;
    new_payment_status: PaymentStatus;
    reason: string;
    reference: string | null;
    amount: number | null;
    created_at: string;
    admin_user_id: string;
  }>;
};

export type CrmResponse = {
  leads: CrmLead[];
  count: number;
  limit: number;
  offset: number;
  stats: Record<string, number> & { total: number; revenue: number };
};

export type PaymentOverrideActivationResult = {
  paymentOverrideCreated: boolean;
  userActivated: boolean;
  creditsGranted: boolean;
  affiliateConversionCreated: boolean;
  checkoutSessionUpdated: boolean;
  pendingRegistrationCleaned: boolean;
  warnings?: string[];
};

export type PaymentOverrideResponse = {
  activationResult: PaymentOverrideActivationResult;
};

export const paymentOptions: Array<{ value: PaymentStatus; label: string }> = [
  { value: "new", label: "Baru" },
  { value: "checkout_started", label: "Mulai Checkout" },
  { value: "pending_payment", label: "Menunggu Bayar" },
  { value: "paid", label: "Lunas" },
  { value: "paid_manual", label: "Lunas Manual" },
  { value: "failed", label: "Gagal" },
  { value: "cancelled", label: "Dibatalkan" },
  { value: "refunded", label: "Refund" },
];

export const leadOptions: Array<{ value: LeadStatus; label: string }> = [
  { value: "new_lead", label: "Lead Baru" },
  { value: "contacted", label: "Sudah Dihubungi" },
  { value: "interested", label: "Tertarik" },
  { value: "checkout_started", label: "Mulai Checkout" },
  { value: "pending_payment", label: "Menunggu Bayar" },
  { value: "paid", label: "Lunas" },
  { value: "onboarded", label: "Onboarded" },
  { value: "no_response", label: "Tidak Respon" },
  { value: "not_interested", label: "Tidak Tertarik" },
];

export const kanbanColumns: Array<{ key: PaymentStatus; title: string; color: string }> = [
  { key: "pending_payment", title: "Menunggu Bayar", color: "#f59e0b" },
  { key: "paid", title: "Lunas (Webhook)", color: "#10b981" },
  { key: "paid_manual", title: "Lunas Manual", color: "#6366f1" },
  { key: "failed", title: "Gagal", color: "#ef4444" },
  { key: "cancelled", title: "Dibatalkan", color: "#64748b" },
];