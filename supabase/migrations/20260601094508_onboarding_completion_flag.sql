ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.profiles
SET onboarding_completed = TRUE
WHERE onboarding_completed = FALSE
  AND NULLIF(BTRIM(COALESCE(nickname, '')), '') IS NOT NULL
  AND NULLIF(BTRIM(COALESCE(children_count, '')), '') IS NOT NULL;

ALTER TABLE public.profiles
  ALTER COLUMN last_period_date DROP NOT NULL,
  ALTER COLUMN last_period_date DROP DEFAULT;
