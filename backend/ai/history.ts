import { SupabaseClient } from "@supabase/supabase-js";

export async function getAiCreditHistory(supabaseAdmin: SupabaseClient, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("ai_credit_ledger")
    .select("id, amount, balance_after, feature, reason, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}
