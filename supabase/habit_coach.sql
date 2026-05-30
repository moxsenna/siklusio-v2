-- ============================================================
-- Weekly AI Habit Coach plans
-- Run after supabase/ai_credits.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.habit_coach_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_charge'
    CHECK (status IN ('pending_charge', 'active', 'completed', 'archived')),
  mode TEXT NOT NULL
    CHECK (mode IN ('initial', 'renewal')),
  user_goal TEXT NOT NULL,
  user_constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
  cycle_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  previous_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  coach_summary TEXT NOT NULL,
  ai_model TEXT NOT NULL,
  credit_cost INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week_start, status)
);

CREATE TABLE IF NOT EXISTS public.habit_coach_plan_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.habit_coach_plans(id) ON DELETE CASCADE,
  date_key DATE NOT NULL,
  day_index INTEGER NOT NULL CHECK (day_index BETWEEN 1 AND 7),
  focus TEXT NOT NULL,
  tasks JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(plan_id, date_key)
);

ALTER TABLE public.habit_coach_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_coach_plan_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_habit_coach_plans"
ON public.habit_coach_plans;

CREATE POLICY "service_role_full_access_habit_coach_plans"
ON public.habit_coach_plans
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access_habit_coach_plan_days"
ON public.habit_coach_plan_days;

CREATE POLICY "service_role_full_access_habit_coach_plan_days"
ON public.habit_coach_plan_days
TO service_role
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_habit_coach_plans_user_week
ON public.habit_coach_plans(user_id, week_start DESC);

CREATE INDEX IF NOT EXISTS idx_habit_coach_plan_days_plan
ON public.habit_coach_plan_days(plan_id, day_index);
