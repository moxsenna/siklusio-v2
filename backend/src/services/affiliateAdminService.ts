import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../supabase/types/database.types";

export const AFFILIATE_UPDATE_ALLOWED_FIELDS = [
  "name",
  "email",
  "whatsapp",
  "commission_type",
  "commission_value",
  "bank_name",
  "account_number",
  "account_holder",
  "is_active",
  "allow_zero_order_commission",
] as const;

export type CreateAffiliateInput = {
  name?: string;
  email?: string;
  whatsapp?: string;
  code?: string;
  commission_type?: string;
  commission_value?: number | string | null;
  bank_name?: string | null;
  account_number?: string | null;
  account_holder?: string | null;
  autoCreateCoupon?: boolean;
  coupon_discount_type?: string;
  coupon_discount_value?: number | string | null;
};

export type UpdateAffiliateInput = Partial<
  Record<(typeof AFFILIATE_UPDATE_ALLOWED_FIELDS)[number], unknown>
>;

export type MarkAffiliatePayoutInput = {
  payout_reference?: string | null;
  payout_note?: string | null;
};

export type AffiliateAdminFailure = {
  ok: false;
  status: 400;
  error: string;
};

export function validateCreateAffiliateInput(input: CreateAffiliateInput): string | null {
  const { name, email, whatsapp, code, commission_type, commission_value } = input;
  if (!name || !email || !whatsapp || !code || !commission_type || commission_value == null) {
    return "Data afiliasi tidak lengkap";
  }
  return null;
}

export function pickAffiliateUpdateFields(updates: UpdateAffiliateInput): Record<string, unknown> {
  const safeUpdates: Record<string, unknown> = {};
  for (const key of AFFILIATE_UPDATE_ALLOWED_FIELDS) {
    if (updates[key] !== undefined) {
      safeUpdates[key] = updates[key];
    }
  }
  return safeUpdates;
}

export async function listAffiliates(supabaseAdmin: SupabaseClient<Database>) {
  const { data, error } = await supabaseAdmin
    .from("affiliates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export type CreateAffiliateResult =
  | { ok: true; kind: "affiliate"; affiliate: Database["public"]["Tables"]["affiliates"]["Row"] }
  | { ok: true; kind: "rpc"; result: unknown }
  | AffiliateAdminFailure;

export async function createAffiliate(
  supabaseAdmin: SupabaseClient<Database>,
  input: CreateAffiliateInput,
): Promise<CreateAffiliateResult> {
  const validationError = validateCreateAffiliateInput(input);
  if (validationError) {
    return { ok: false, status: 400, error: validationError };
  }

  const {
    name,
    email,
    whatsapp,
    code,
    commission_type,
    commission_value,
    bank_name,
    account_number,
    account_holder,
    autoCreateCoupon,
    coupon_discount_type,
    coupon_discount_value,
  } = input;

  if (autoCreateCoupon) {
    const { data, error } = await supabaseAdmin.rpc("create_affiliate_with_coupon", {
      p_name: name!,
      p_email: email!,
      p_whatsapp: whatsapp!,
      p_code: code!,
      p_commission_type: commission_type!,
      p_commission_value: Number(commission_value),
      p_bank_name: bank_name || null,
      p_account_number: account_number || null,
      p_account_holder: account_holder || null,
      p_auto_coupon: true,
      p_coupon_discount_type: coupon_discount_type || "percentage",
      p_coupon_discount_value: Number(coupon_discount_value || 10),
    });
    if (error) throw error;
    return { ok: true, kind: "rpc", result: data };
  }

  const { data, error } = await supabaseAdmin
    .from("affiliates")
    .insert({
      name: name!,
      email: email!,
      whatsapp: whatsapp!,
      code: code!.trim().toUpperCase(),
      commission_type: commission_type!,
      commission_value: Number(commission_value),
      bank_name: bank_name || null,
      account_number: account_number || null,
      account_holder: account_holder || null,
    })
    .select()
    .single();

  if (error) throw error;
  return { ok: true, kind: "affiliate", affiliate: data };
}

export async function updateAffiliate(
  supabaseAdmin: SupabaseClient<Database>,
  id: string,
  updates: UpdateAffiliateInput,
) {
  const safeUpdates = pickAffiliateUpdateFields(updates);
  const { error } = await supabaseAdmin
    .from("affiliates")
    .update(safeUpdates as Database["public"]["Tables"]["affiliates"]["Update"])
    .eq("id", id);

  if (error) throw error;
}

export async function deleteAffiliate(supabaseAdmin: SupabaseClient<Database>, id: string) {
  const { error } = await supabaseAdmin.from("affiliates").delete().eq("id", id);
  if (error) throw error;
}

export async function listAffiliateConversions(supabaseAdmin: SupabaseClient<Database>) {
  const { data, error } = await supabaseAdmin
    .from("affiliate_conversions")
    .select("*, affiliates(name, code, email, whatsapp, bank_name, account_number, account_holder)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function markAffiliateConversionPaid(
  supabaseAdmin: SupabaseClient<Database>,
  params: {
    conversionId: string;
    markedBy: string;
    payout: MarkAffiliatePayoutInput;
  },
) {
  const { conversionId, markedBy, payout } = params;
  const { error } = await supabaseAdmin
    .from("affiliate_conversions")
    .update({
      payout_status: "paid",
      payout_at: new Date().toISOString(),
      payout_marked_by: markedBy,
      payout_reference: payout.payout_reference || null,
      payout_note: payout.payout_note || null,
    })
    .eq("id", conversionId);

  if (error) throw error;
}
