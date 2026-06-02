ALTER TABLE public.pending_registrations
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS affiliate_code TEXT;

CREATE TABLE IF NOT EXISTS public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  whatsapp TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  commission_type TEXT NOT NULL CHECK (commission_type IN ('nominal', 'percentage')),
  commission_value NUMERIC NOT NULL CHECK (commission_value >= 0),
  allow_zero_order_commission BOOLEAN NOT NULL DEFAULT false,
  bank_name TEXT,
  account_number TEXT,
  account_holder TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'affiliates'
      AND policyname = 'service_role_full_access_affiliates'
  ) THEN
    CREATE POLICY "service_role_full_access_affiliates"
      ON public.affiliates
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_affiliates_code
  ON public.affiliates(code);

CREATE INDEX IF NOT EXISTS idx_affiliates_is_active
  ON public.affiliates(is_active);

CREATE TABLE IF NOT EXISTS public.checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  coupon_code TEXT,
  affiliate_code TEXT,
  final_amount NUMERIC NOT NULL DEFAULT 0,
  mayar_link TEXT,
  mayar_transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'expired', 'free_bypass')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'checkout_sessions'
      AND policyname = 'service_role_full_access_checkout_sessions'
  ) THEN
    CREATE POLICY "service_role_full_access_checkout_sessions"
      ON public.checkout_sessions
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_email
  ON public.checkout_sessions(email);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_mayar_tx
  ON public.checkout_sessions(mayar_transaction_id);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_status
  ON public.checkout_sessions(status);

CREATE TABLE IF NOT EXISTS public.affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  checkout_session_id UUID REFERENCES public.checkout_sessions(id),
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_whatsapp TEXT NOT NULL,
  amount_paid NUMERIC NOT NULL CHECK (amount_paid >= 0),
  commission_amount NUMERIC NOT NULL CHECK (commission_amount >= 0),
  mayar_transaction_id TEXT,
  payout_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payout_status IN ('pending', 'paid')),
  payout_at TIMESTAMP WITH TIME ZONE,
  payout_marked_by TEXT,
  payout_reference TEXT,
  payout_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'affiliate_conversions'
      AND policyname = 'service_role_full_access_conversions'
  ) THEN
    CREATE POLICY "service_role_full_access_conversions"
      ON public.affiliate_conversions
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_conversions_affiliate_id
  ON public.affiliate_conversions(affiliate_id);

CREATE INDEX IF NOT EXISTS idx_conversions_payout_status
  ON public.affiliate_conversions(payout_status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversions_mayar_tx_unique
  ON public.affiliate_conversions(mayar_transaction_id)
  WHERE mayar_transaction_id IS NOT NULL;
