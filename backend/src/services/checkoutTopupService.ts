import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Context } from "hono";
import type { Env } from "../env";
import { resolveTopupPackage, type TopupPackage } from "../payments/topupPackages";
import { createMayarPaymentLink } from "./mayar";

export type BindingsContext = Context<{ Bindings: Env }>;

export type CheckoutTopupFailure = {
  ok: false;
  status: 400 | 500;
  error: string;
};

export type CheckoutTopupResult =
  | { ok: true; paymentUrl: string }
  | CheckoutTopupFailure;

export function buildTopupCustomerDetails(params: {
  profile?: { name?: string | null; whatsapp_number?: string | null } | null;
  user: Pick<User, "email">;
}) {
  return {
    name: params.profile?.name || params.user.email?.split("@")[0] || "User",
    whatsapp: params.profile?.whatsapp_number || "-",
    email: params.user.email || "",
  };
}

export function buildTopupMayarProductFields(selectedPackage: TopupPackage) {
  return {
    productName: `Top Up Kredit AI Siklusio (${selectedPackage.credits} Kredit)`,
    productDescription: `Top up saldo kredit AI Siklusio sebanyak ${selectedPackage.credits} kredit.`,
    productId: selectedPackage.id || `ai_credit_topup_${selectedPackage.credits}`,
  };
}

export async function processCheckoutTopup(params: {
  c: BindingsContext;
  supabaseAdmin: SupabaseClient;
  user: User;
  packageId: unknown;
}): Promise<CheckoutTopupResult> {
  const { c, supabaseAdmin, user, packageId } = params;

  const selectedPackage = resolveTopupPackage(packageId);
  if (!selectedPackage) {
    return { ok: false, status: 400, error: "Paket topup tidak valid." };
  }

  const mayarKey = c.env.MAYAR_API_KEY;
  if (!mayarKey) {
    return { ok: false, status: 500, error: "Konfigurasi pembayaran belum tersedia." };
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("name, whatsapp_number")
    .eq("id", user.id)
    .maybeSingle();

  const customer = buildTopupCustomerDetails({ profile, user });
  const product = buildTopupMayarProductFields(selectedPackage);

  console.log("--> Calling Mayar API to create topup link...");
  const { link: paymentUrl, id: mayarTxId } = await createMayarPaymentLink(mayarKey, {
    customerName: customer.name,
    amount: selectedPackage.price,
    productName: product.productName,
    productDescription: product.productDescription,
    productId: product.productId,
    redirectUrl: "https://app.siklusio.web.id/auth?status=topup_success",
    email: customer.email,
    mobile: customer.whatsapp,
  });

  const { error: insertErr } = await supabaseAdmin.from("ai_credit_topups").insert({
    user_id: user.id,
    mayar_link: paymentUrl,
    mayar_transaction_id: mayarTxId,
    amount_rp: selectedPackage.price,
    credits_amount: selectedPackage.credits,
    status: "pending",
  });

  if (insertErr) {
    console.error("DB Insert topup error:", insertErr);
    return { ok: false, status: 500, error: "Gagal memproses permintaan topup." };
  }

  return { ok: true, paymentUrl };
}