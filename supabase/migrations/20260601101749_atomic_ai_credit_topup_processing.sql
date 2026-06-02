CREATE OR REPLACE FUNCTION public.process_paid_ai_credit_topup(
  p_mayar_transaction_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claimed_topup public.ai_credit_topups%ROWTYPE;
  existing_topup public.ai_credit_topups%ROWTYPE;
  balance_after INTEGER;
BEGIN
  IF p_mayar_transaction_id IS NULL OR BTRIM(p_mayar_transaction_id) = '' THEN
    RETURN jsonb_build_object(
      'processed', false,
      'status', 'missing_transaction_id'
    );
  END IF;

  UPDATE public.ai_credit_topups
  SET status = 'paid',
      paid_at = COALESCE(paid_at, TIMEZONE('utc'::text, NOW()))
  WHERE mayar_transaction_id = p_mayar_transaction_id
    AND status = 'pending'
  RETURNING * INTO claimed_topup;

  IF FOUND THEN
    balance_after := public.grant_ai_credits(
      claimed_topup.user_id,
      claimed_topup.credits_amount,
      'topup',
      'Mayar Top-up ' || claimed_topup.credits_amount || ' Kredit',
      claimed_topup.id,
      jsonb_build_object('mayar_transaction_id', p_mayar_transaction_id)
    );

    RETURN jsonb_build_object(
      'processed', true,
      'status', 'paid',
      'balance', balance_after,
      'topup_id', claimed_topup.id,
      'user_id', claimed_topup.user_id
    );
  END IF;

  SELECT *
  INTO existing_topup
  FROM public.ai_credit_topups
  WHERE mayar_transaction_id = p_mayar_transaction_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'processed', false,
      'status', 'not_found'
    );
  END IF;

  RETURN jsonb_build_object(
    'processed', false,
    'status', CASE
      WHEN existing_topup.status = 'paid' THEN 'already_paid'
      ELSE existing_topup.status
    END,
    'topup_id', existing_topup.id,
    'user_id', existing_topup.user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_paid_ai_credit_topup(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_paid_ai_credit_topup(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.process_paid_ai_credit_topup(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.process_paid_ai_credit_topup(TEXT) TO service_role;
