-- ============================================================
-- TWW Sanctuary daily letter cache (Surat Tenang AI)
-- Run after supabase/ai_credits.sql
-- Privacy-first: stores journal_hash + journal_preview only,
--   never stores raw user journal text.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tww_sanctuary_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  generated_for_date DATE NOT NULL,
  -- Privacy: raw journal is never stored.
  -- journal_hash: SHA-256 hex of the trimmed journal (audit/dedup only)
  -- journal_preview: first 240 chars (optional, for admin review if needed)
  journal_hash TEXT,
  journal_preview TEXT,
  result JSONB NOT NULL,
  -- pending_charge: AI done, credit not yet charged
  -- active: fully committed, visible to user
  -- failed: charge or activation failed; row kept for audit
  status TEXT NOT NULL DEFAULT 'pending_charge'
    CHECK (status IN ('pending_charge', 'active', 'failed')),
  ai_model TEXT NOT NULL,
  credit_cost INTEGER NOT NULL DEFAULT 25,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  -- One letter per user per day. pending/failed rows block new inserts
  -- until controller cleans them up (see controller recovery logic).
  UNIQUE (user_id, generated_for_date)
);

-- Index for fast daily lookups
CREATE INDEX IF NOT EXISTS idx_tww_sanctuary_letters_user_date
  ON public.tww_sanctuary_letters (user_id, generated_for_date DESC);

-- Row Level Security: backend service_role only.
-- Client apps access this via the Hono backend, never directly.
ALTER TABLE public.tww_sanctuary_letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_tww_sanctuary_letters"
  ON public.tww_sanctuary_letters;

CREATE POLICY "service_role_full_access_tww_sanctuary_letters"
  ON public.tww_sanctuary_letters
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Optional: allow authenticated users to read their own letters
-- (only needed if mobile ever queries Supabase directly, not via backend)
-- DROP POLICY IF EXISTS "users_read_own_tww_sanctuary_letters" ON public.tww_sanctuary_letters;
-- CREATE POLICY "users_read_own_tww_sanctuary_letters"
--   ON public.tww_sanctuary_letters FOR SELECT
--   USING (auth.uid() = user_id);
