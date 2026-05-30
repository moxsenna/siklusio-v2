-- ============================================================
-- AI credit balances and ledger
-- Run after supabase/schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_credit_balances (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  feature TEXT NOT NULL,
  reason TEXT NOT NULL,
  reference_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_ai_credit_balances"
ON public.ai_credit_balances;

CREATE POLICY "service_role_full_access_ai_credit_balances"
ON public.ai_credit_balances
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access_ai_credit_ledger"
ON public.ai_credit_ledger;

CREATE POLICY "service_role_full_access_ai_credit_ledger"
ON public.ai_credit_ledger
TO service_role
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ai_credit_ledger_user_created
ON public.ai_credit_ledger(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.ensure_ai_credit_balance(p_user_id UUID)
RETURNS public.ai_credit_balances
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  row_out public.ai_credit_balances;
BEGIN
  INSERT INTO public.ai_credit_balances(user_id, balance)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO row_out
  FROM public.ai_credit_balances
  WHERE user_id = p_user_id;

  RETURN row_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_ai_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_feature TEXT,
  p_reason TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'grant amount must be positive';
  END IF;

  PERFORM public.ensure_ai_credit_balance(p_user_id);

  UPDATE public.ai_credit_balances
  SET balance = balance + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO new_balance;

  INSERT INTO public.ai_credit_ledger(
    user_id,
    amount,
    balance_after,
    feature,
    reason,
    reference_id,
    metadata
  )
  VALUES (
    p_user_id,
    p_amount,
    new_balance,
    p_feature,
    p_reason,
    p_reference_id,
    p_metadata
  );

  RETURN new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.charge_ai_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_feature TEXT,
  p_reason TEXT,
  p_reference_id UUID,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'charge amount must be positive';
  END IF;

  PERFORM public.ensure_ai_credit_balance(p_user_id);

  SELECT balance INTO current_balance
  FROM public.ai_credit_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF current_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient_ai_credits:%:%', current_balance, p_amount;
  END IF;

  UPDATE public.ai_credit_balances
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO new_balance;

  INSERT INTO public.ai_credit_ledger(
    user_id,
    amount,
    balance_after,
    feature,
    reason,
    reference_id,
    metadata
  )
  VALUES (
    p_user_id,
    -p_amount,
    new_balance,
    p_feature,
    p_reason,
    p_reference_id,
    p_metadata
  );

  RETURN new_balance;
END;
$$;
