-- ============================================================
-- Daily cache for free-included AI endpoints (cycle report, habits insight)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_daily_generation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature TEXT NOT NULL CHECK (feature IN ('cycle_report', 'habits_insight')),
  generated_for_date DATE NOT NULL,
  result JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, feature, generated_for_date)
);

ALTER TABLE public.ai_daily_generation_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_ai_daily_generation_cache"
  ON public.ai_daily_generation_cache;
CREATE POLICY "service_role_full_access_ai_daily_generation_cache"
  ON public.ai_daily_generation_cache
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own AI daily cache"
  ON public.ai_daily_generation_cache;
CREATE POLICY "Users can read own AI daily cache"
  ON public.ai_daily_generation_cache
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_daily_generation_cache_user_feature_date
  ON public.ai_daily_generation_cache (user_id, feature, generated_for_date DESC);