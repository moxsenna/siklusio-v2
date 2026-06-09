import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "../../../supabase/types/database.types";

export type ValidateAffiliateCodeResult = { valid: false } | { valid: true; discountLabel: string };

export type RegisterPublicAffiliateInput = {
  code?: string;
  bank_name?: string | null;
  account_number?: string | null;
  account_holder?: string | null;
};

export type RegisterPublicAffiliateResult =
  | { ok: true; affiliate: unknown }
  | { ok: false; status: 400; error: string };

export type UpdatePublicAffiliateBankInput = {
  bank_name?: string | null;
  account_number?: string | null;
  account_holder?: string | null;
};

export function normalizePublicAffiliateCode(code: string): string {
  return code.trim().toUpperCase();
}

export function normalizeRegistrationAffiliateCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s/g, "");
}

export function validateRegistrationCodeInput(code?: string): string | null {
  if (!code) {
    return "Kode referal wajib diisi";
  }
  return null;
}

export async function validatePublicAffiliateCode(
  supabaseAdmin: SupabaseClient<Database>,
  rawCode: string,
): Promise<ValidateAffiliateCodeResult> {
  const code = normalizePublicAffiliateCode(rawCode);
  if (!code) {
    return { valid: false };
  }

  const { data: affiliate } = await supabaseAdmin
    .from("affiliates")
    .select("code, commission_type, commission_value")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();

  if (!affiliate) {
    return { valid: false };
  }

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

  return { valid: true, discountLabel };
}

export async function getAffiliateForUser(
  supabaseAdmin: SupabaseClient<Database>,
  email: string | undefined,
) {
  if (!email) {
    return null;
  }

  const { data: affiliate } = await supabaseAdmin
    .from("affiliates")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  return affiliate ?? null;
}

export async function registerPublicAffiliate(
  supabaseAdmin: SupabaseClient<Database>,
  user: User,
  input: RegisterPublicAffiliateInput,
): Promise<RegisterPublicAffiliateResult> {
  const validationError = validateRegistrationCodeInput(input.code);
  if (validationError) {
    return { ok: false, status: 400, error: validationError };
  }

  const safeCode = normalizeRegistrationAffiliateCode(input.code!);

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
    p_bank_name: input.bank_name || null,
    p_account_number: input.account_number || null,
    p_account_holder: input.account_holder || null,
    p_auto_coupon: false,
    p_coupon_discount_type: "percentage",
    p_coupon_discount_value: 0,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, status: 400, error: "Kode referal sudah digunakan, pilih kode lain." };
    }
    throw error;
  }

  return { ok: true, affiliate: data };
}

export async function listAffiliateConversionsForUser(
  supabaseAdmin: SupabaseClient<Database>,
  email: string | undefined,
) {
  const affiliate = await getAffiliateForUser(supabaseAdmin, email);
  if (!affiliate) {
    return [];
  }

  const { data: conversions, error } = await supabaseAdmin
    .from("affiliate_conversions")
    .select("*")
    .eq("affiliate_id", affiliate.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return conversions || [];
}

export async function updateAffiliateBankForUser(
  supabaseAdmin: SupabaseClient<Database>,
  email: string | undefined,
  input: UpdatePublicAffiliateBankInput,
) {
  const { error } = await supabaseAdmin
    .from("affiliates")
    .update({
      bank_name: input.bank_name,
      account_number: input.account_number,
      account_holder: input.account_holder,
    })
    .eq("email", email);

  if (error) throw error;
}
