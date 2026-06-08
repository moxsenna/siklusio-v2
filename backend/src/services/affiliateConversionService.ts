import type { SupabaseClient } from "@supabase/supabase-js";
import { logInfo, logError } from "../logging/redaction";

export type AffiliateRecord = {
  id: string;
  commission_type: string;
  commission_value: number;
  allow_zero_order_commission?: boolean | null;
};

export type AffiliateConversionBuyer = {
  name?: string | null;
  email: string;
  whatsapp?: string | null;
};

export type AffiliateConversionSession = {
  id: string;
  final_amount?: number | null;
  mayar_transaction_id?: string | null;
};

export type AffiliateConversionInsertResult = {
  created: boolean;
  duplicate?: boolean;
  error?: unknown;
  commissionAmount?: number;
};

export type AdminManualAffiliateConversionResult = AffiliateConversionInsertResult & {
  warnings: string[];
  pendingCheckoutSession: AffiliateConversionSession | null;
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

async function loadActiveAffiliateByCode(
  supabaseAdmin: SupabaseClient,
  affiliateCode: string,
): Promise<AffiliateRecord | null> {
  const { data: affiliate } = await supabaseAdmin
    .from("affiliates")
    .select("id, commission_type, commission_value, allow_zero_order_commission")
    .eq("code", affiliateCode)
    .eq("is_active", true)
    .maybeSingle();

  return affiliate ?? null;
}

export async function recordWebhookAffiliateConversion(params: {
  supabaseAdmin: SupabaseClient;
  affiliateCode: string;
  buyer: AffiliateConversionBuyer;
  session: AffiliateConversionSession | null;
  mayarTransactionId: string | null;
  fallbackAmount?: number | null;
}): Promise<AffiliateConversionInsertResult> {
  const { supabaseAdmin, affiliateCode, buyer, session, mayarTransactionId, fallbackAmount } =
    params;

  logInfo(`--> Processing affiliate conversion for code: ${affiliateCode}`);

  const affiliate = await loadActiveAffiliateByCode(supabaseAdmin, affiliateCode);
  if (!affiliate) return { created: false };

  const amountPaid = session?.final_amount || fallbackAmount || 0;
  const commissionAmount = calculateAffiliateCommission(Number(amountPaid), affiliate);

  const { error: convErr } = await supabaseAdmin.from("affiliate_conversions").insert({
    affiliate_id: affiliate.id,
    checkout_session_id: session?.id || null,
    buyer_name: buyer.name,
    buyer_email: buyer.email,
    buyer_whatsapp: buyer.whatsapp,
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

export async function recordAdminManualAffiliateConversion(params: {
  supabaseAdmin: SupabaseClient;
  affiliateCode: string;
  email: string;
  buyerName: string;
  buyerWhatsapp: string;
  amount?: number | null;
}): Promise<AdminManualAffiliateConversionResult> {
  const { supabaseAdmin, affiliateCode, email, buyerName, buyerWhatsapp, amount } = params;
  const warnings: string[] = [];
  const normalizedCode = affiliateCode.trim().toUpperCase();

  const { data: session } = await supabaseAdmin
    .from("checkout_sessions")
    .select("id, final_amount, mayar_transaction_id")
    .eq("email", email)
    .eq("affiliate_code", normalizedCode)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const affiliate = await loadActiveAffiliateByCode(supabaseAdmin, normalizedCode);
  if (!affiliate) {
    return { created: false, warnings, pendingCheckoutSession: session };
  }

  const amountPaid = session?.final_amount || amount || 0;
  const commissionAmount = calculateAffiliateCommission(Number(amountPaid), affiliate);

  const { data: existingConv } = await supabaseAdmin
    .from("affiliate_conversions")
    .select("id")
    .eq("affiliate_id", affiliate.id)
    .eq("buyer_email", email)
    .maybeSingle();

  if (existingConv) {
    warnings.push("Konversi afiliasi untuk transaksi ini sudah tercatat.");
    return {
      created: false,
      duplicate: true,
      warnings,
      pendingCheckoutSession: session,
    };
  }

  const { error: convErr } = await supabaseAdmin.from("affiliate_conversions").insert({
    affiliate_id: affiliate.id,
    checkout_session_id: session?.id || null,
    buyer_name: buyerName,
    buyer_email: email,
    buyer_whatsapp: buyerWhatsapp,
    amount_paid: Number(amountPaid),
    commission_amount: commissionAmount,
    mayar_transaction_id: session?.mayar_transaction_id || null,
  });

  if (convErr) {
    if (convErr.code === "23505") {
      warnings.push("Konversi afiliasi sudah terdaftar (23505).");
      return {
        created: false,
        duplicate: true,
        warnings,
        pendingCheckoutSession: session,
      };
    }
    logError("Error inserting affiliate conversion in manual override:", convErr);
    return { created: false, error: convErr, warnings, pendingCheckoutSession: session };
  }

  return {
    created: true,
    commissionAmount,
    warnings,
    pendingCheckoutSession: session,
  };
}