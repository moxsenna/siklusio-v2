-- ============================================================
-- SQL schema for checkout sessions
-- Tracks each checkout attempt with full attribution data [FIX-2]
-- Run AFTER pending_registrations.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.checkout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    coupon_code TEXT,
    affiliate_code TEXT,
    final_amount NUMERIC NOT NULL DEFAULT 0,
    mayar_link TEXT,                -- URL payment link dari Mayar
    mayar_transaction_id TEXT,      -- ID transaksi dari Mayar response
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'paid', 'expired', 'free_bypass')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

-- Only service_role (backend) can access
CREATE POLICY "service_role_full_access_checkout_sessions" 
ON public.checkout_sessions TO service_role USING (true) WITH CHECK (true);

-- Indexes for webhook lookup
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_email 
ON public.checkout_sessions(email);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_mayar_tx 
ON public.checkout_sessions(mayar_transaction_id);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_status 
ON public.checkout_sessions(status);
