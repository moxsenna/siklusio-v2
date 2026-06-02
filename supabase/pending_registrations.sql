-- ============================================================
-- SQL schema for pending registrations
-- Run AFTER schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pending_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  coupon_code TEXT,
  affiliate_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (needed for backend)
CREATE POLICY "Allow service_role full access" 
  ON public.pending_registrations TO service_role 
  USING (true) 
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_pending_registrations_user_id
  ON public.pending_registrations(user_id);
