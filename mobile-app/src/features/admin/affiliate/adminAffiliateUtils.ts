import type { Affiliate, CreateAffiliatePayload } from "./adminAffiliateTypes";

export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export function formatRupiah(val: number) {
  return `Rp ${val.toLocaleString("id-ID")}`;
}

export function formatCommissionLabel(aff: Pick<Affiliate, "commission_type" | "commission_value">) {
  return aff.commission_type === "percentage"
    ? `${aff.commission_value}%`
    : formatRupiah(aff.commission_value);
}

export const EMPTY_AFFILIATE_FORM: CreateAffiliatePayload = {
  name: "",
  email: "",
  whatsapp: "",
  code: "",
  commission_type: "percentage",
  commission_value: 40,
  bank_name: "",
  account_number: "",
  account_holder: "",
  autoCreateCoupon: false,
  coupon_discount_type: "percentage",
  coupon_discount_value: 0,
};

export function validateCreateAffiliateForm(form: CreateAffiliatePayload) {
  return Boolean(form.name && form.email && form.whatsapp && form.code);
}