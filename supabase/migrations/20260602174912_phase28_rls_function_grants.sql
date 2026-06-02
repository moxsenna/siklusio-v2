-- Phase 28: tighten RLS helper and RPC execution grants.
--
-- Goals:
-- 1. Keep client-callable community RPCs limited to authenticated users.
-- 2. Keep AI credit mutation RPCs service-role only.
-- 3. Prevent direct RPC calls from using is_admin(uid) to probe another user's admin flag.
-- 4. Remove public/anon/authenticated EXECUTE surface from trigger-only helper functions.

CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  caller_uid UUID := auth.uid();
  caller_is_admin BOOLEAN;
BEGIN
  IF uid IS NULL OR caller_uid IS NULL OR caller_uid IS DISTINCT FROM uid THEN
    RETURN FALSE;
  END IF;

  SELECT p.is_admin
  INTO caller_is_admin
  FROM public.profiles p
  WHERE p.id = uid;

  RETURN COALESCE(caller_is_admin, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_ai_credit_balance(p_user_id UUID)
RETURNS public.ai_credit_balances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
SET search_path = ''
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
SET search_path = ''
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

-- Public/admin community RPCs: callable by authenticated users only.
REVOKE ALL ON FUNCTION public.get_community_feed(INTEGER, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_community_feed(INTEGER, TIMESTAMPTZ) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_post_comments(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_post_comments(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_get_moderation_queue(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_moderation_queue(TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_moderate_target(TEXT, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_moderate_target(TEXT, UUID, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_reset_user_avatar(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_avatar(UUID) TO authenticated, service_role;

-- Admin helper can be used by authenticated policies, but not by anonymous clients.
REVOKE ALL ON FUNCTION public.is_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated, service_role;

-- AI credit mutation helpers are backend/service-role only.
REVOKE ALL ON FUNCTION public.ensure_ai_credit_balance(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_ai_credit_balance(UUID) TO service_role;

REVOKE ALL ON FUNCTION public.grant_ai_credits(UUID, INTEGER, TEXT, TEXT, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_ai_credits(UUID, INTEGER, TEXT, TEXT, UUID, JSONB) TO service_role;

REVOKE ALL ON FUNCTION public.charge_ai_credits(UUID, INTEGER, TEXT, TEXT, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.charge_ai_credits(UUID, INTEGER, TEXT, TEXT, UUID, JSONB) TO service_role;

REVOKE ALL ON FUNCTION public.process_paid_ai_credit_topup(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_paid_ai_credit_topup(TEXT) TO service_role;

-- Trigger-only helpers should not be callable through public RPC surfaces.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO service_role;

REVOKE ALL ON FUNCTION public.community_post_rate_limit() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.community_post_rate_limit() TO service_role;

REVOKE ALL ON FUNCTION public.community_comment_rate_limit() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.community_comment_rate_limit() TO service_role;

REVOKE ALL ON FUNCTION public.community_comments_count_trigger() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.community_comments_count_trigger() TO service_role;

REVOKE ALL ON FUNCTION public.community_reactions_count_trigger() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.community_reactions_count_trigger() TO service_role;

REVOKE ALL ON FUNCTION public.community_reports_after_insert() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.community_reports_after_insert() TO service_role;

-- Affiliate registration helper is called only by the backend service-role client.
CREATE OR REPLACE FUNCTION public.create_affiliate_with_coupon(
  p_name TEXT,
  p_email TEXT,
  p_whatsapp TEXT,
  p_code TEXT,
  p_commission_type TEXT,
  p_commission_value NUMERIC,
  p_bank_name TEXT DEFAULT NULL,
  p_account_number TEXT DEFAULT NULL,
  p_account_holder TEXT DEFAULT NULL,
  p_auto_coupon BOOLEAN DEFAULT false,
  p_coupon_discount_type TEXT DEFAULT 'percentage',
  p_coupon_discount_value NUMERIC DEFAULT 10
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_affiliate_id UUID;
BEGIN
  INSERT INTO public.affiliates (
    name,
    email,
    whatsapp,
    code,
    commission_type,
    commission_value,
    bank_name,
    account_number,
    account_holder
  )
  VALUES (
    p_name,
    p_email,
    p_whatsapp,
    UPPER(p_code),
    p_commission_type,
    p_commission_value,
    p_bank_name,
    p_account_number,
    p_account_holder
  )
  RETURNING id INTO v_affiliate_id;

  IF p_auto_coupon THEN
    INSERT INTO public.coupons (code, discount_type, discount_value, is_active)
    VALUES (UPPER(p_code), p_coupon_discount_type, p_coupon_discount_value, true);
  END IF;

  RETURN json_build_object(
    'affiliate_id', v_affiliate_id,
    'code', UPPER(p_code),
    'coupon_created', p_auto_coupon
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_affiliate_with_coupon(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, BOOLEAN, TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_affiliate_with_coupon(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, BOOLEAN, TEXT, NUMERIC) TO service_role;
