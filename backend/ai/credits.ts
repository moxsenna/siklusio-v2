export async function getAiCreditBalance(supabaseAdmin: any, userId: string) {
  const { error: ensureError } = await supabaseAdmin.rpc("ensure_ai_credit_balance", {
    p_user_id: userId,
  });

  if (ensureError) throw ensureError;

  const { data, error } = await supabaseAdmin
    .from("ai_credit_balances")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return Number(data?.balance || 0);
}

export async function chargeAiCredits(params: {
  supabaseAdmin: any;
  userId: string;
  amount: number;
  feature: string;
  reason: string;
  referenceId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await params.supabaseAdmin.rpc("charge_ai_credits", {
    p_user_id: params.userId,
    p_amount: params.amount,
    p_feature: params.feature,
    p_reason: params.reason,
    p_reference_id: params.referenceId,
    p_metadata: params.metadata || {},
  });

  if (error) throw error;
  return Number(data);
}
