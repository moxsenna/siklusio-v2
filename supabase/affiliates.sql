-- ============================================================
-- SQL schema for affiliates (promotors)
-- [FIX-3] NO public read policy — data stays private
-- [FIX-4] Includes banking fields for payout
-- Run AFTER schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.affiliates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    whatsapp TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,          -- Kode rujukan (contoh: 'BUNDAPROMIL')
    -- Komisi
    commission_type TEXT NOT NULL CHECK (commission_type IN ('nominal', 'percentage')),
    commission_value NUMERIC NOT NULL CHECK (commission_value >= 0),
    allow_zero_order_commission BOOLEAN NOT NULL DEFAULT false, -- [FIX-5]
    -- Data Bank untuk Payout [FIX-4]
    bank_name TEXT,                     -- Cth: 'BCA', 'Mandiri', 'GoPay'
    account_number TEXT,                -- No rekening / e-wallet
    account_holder TEXT,                -- Nama pemilik rekening
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

-- [FIX-3] Only service_role can access. No public read.
CREATE POLICY "service_role_full_access_affiliates" 
ON public.affiliates TO service_role USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON public.affiliates(code);
CREATE INDEX IF NOT EXISTS idx_affiliates_is_active ON public.affiliates(is_active);
