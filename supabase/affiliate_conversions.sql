-- ============================================================
-- SQL schema for affiliate conversions (sales tracking)
-- [FIX-1] mayar_transaction_id UNIQUE for idempotent webhooks
-- [FIX-4] Payout audit trail fields
-- Run AFTER affiliates.sql AND checkout_sessions.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.affiliate_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
    checkout_session_id UUID REFERENCES public.checkout_sessions(id),
    -- Buyer data (snapshot)
    buyer_name TEXT NOT NULL,
    buyer_email TEXT NOT NULL,
    buyer_whatsapp TEXT NOT NULL,
    -- Financial
    amount_paid NUMERIC NOT NULL CHECK (amount_paid >= 0),
    commission_amount NUMERIC NOT NULL CHECK (commission_amount >= 0),
    -- Idempotency key [FIX-1]
    mayar_transaction_id TEXT,          -- NULL for free bypass, UNIQUE when filled
    -- Payout tracking [FIX-4]
    payout_status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (payout_status IN ('pending', 'paid')),
    payout_at TIMESTAMP WITH TIME ZONE,
    payout_marked_by TEXT,              -- email/ID admin yang menandai lunas
    payout_reference TEXT,              -- nomor transfer / bukti bayar
    payout_note TEXT,                   -- catatan opsional
    --
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;

-- Only service_role
CREATE POLICY "service_role_full_access_conversions" 
ON public.affiliate_conversions TO service_role USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversions_affiliate_id 
ON public.affiliate_conversions(affiliate_id);

CREATE INDEX IF NOT EXISTS idx_conversions_payout_status 
ON public.affiliate_conversions(payout_status);

-- Partial unique index: only enforce uniqueness when mayar_transaction_id is NOT NULL [FIX-1]
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversions_mayar_tx_unique 
ON public.affiliate_conversions(mayar_transaction_id) 
WHERE mayar_transaction_id IS NOT NULL;
