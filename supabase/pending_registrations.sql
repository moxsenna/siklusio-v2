-- ============================================================
-- SQL schema for pending registrations
-- Run AFTER schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pending_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (needed for backend)
CREATE POLICY "Allow service_role full access" 
  ON public.pending_registrations TO service_role 
  USING (true) 
  WITH CHECK (true);
