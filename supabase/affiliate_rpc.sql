-- ============================================================
-- RPC: Transactional affiliate + coupon creation [FIX-6]
-- If coupon insert fails (e.g. code already exists), 
-- affiliate insert is also rolled back.
-- Run AFTER affiliates.sql AND coupons.sql
-- ============================================================

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
AS $$
DECLARE
    v_affiliate_id UUID;
    v_result JSON;
BEGIN
    -- 1. Create affiliate
    INSERT INTO public.affiliates (
        name, email, whatsapp, code, 
        commission_type, commission_value, 
        bank_name, account_number, account_holder
    )
    VALUES (
        p_name, p_email, p_whatsapp, UPPER(p_code), 
        p_commission_type, p_commission_value,
        p_bank_name, p_account_number, p_account_holder
    )
    RETURNING id INTO v_affiliate_id;

    -- 2. If auto_coupon is enabled, create coupon with same code
    --    If this fails (e.g. UNIQUE violation on coupons.code),
    --    the entire transaction rolls back including the affiliate insert.
    IF p_auto_coupon THEN
        INSERT INTO public.coupons (code, discount_type, discount_value, is_active)
        VALUES (UPPER(p_code), p_coupon_discount_type, p_coupon_discount_value, true);
    END IF;

    -- 3. Return result
    v_result := json_build_object(
        'affiliate_id', v_affiliate_id,
        'code', UPPER(p_code),
        'coupon_created', p_auto_coupon
    );

    RETURN v_result;
END;
$$;
