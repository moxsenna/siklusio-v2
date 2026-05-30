-- ============================================================
-- Saved AI Panduan Siklus results
-- Run after supabase/ai_credits.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cycle_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  generated_for_date DATE NOT NULL,
  guide_level TEXT NOT NULL CHECK (guide_level IN ('starter', 'active', 'personal')),
  cycle_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  habit_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_charge'
    CHECK (status IN ('pending_charge', 'active', 'archived')),
  ai_model TEXT NOT NULL,
  credit_cost INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cycle_guides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_cycle_guides"
ON public.cycle_guides;

CREATE POLICY "service_role_full_access_cycle_guides"
ON public.cycle_guides
TO service_role
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_cycle_guides_user_date
ON public.cycle_guides(user_id, generated_for_date DESC);
