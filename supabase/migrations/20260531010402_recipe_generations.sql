-- ============================================================
-- Saved AI Resep Hari Ini generations
-- Run after supabase/ai_credits.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.recipe_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  generated_for_date DATE NOT NULL,
  phase TEXT NOT NULL,
  cycle_day INTEGER,
  days_to_next_period INTEGER,
  cycle_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_charge'
    CHECK (status IN ('pending_charge', 'active', 'archived')),
  ai_model TEXT NOT NULL,
  credit_cost INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.recipe_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_recipe_generations" ON public.recipe_generations;
CREATE POLICY "service_role_full_access_recipe_generations"
ON public.recipe_generations TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_recipe_generations_user_date
ON public.recipe_generations(user_id, generated_for_date DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_recipe_generations_active_user_date
ON public.recipe_generations(user_id, generated_for_date)
WHERE status = 'active';
