-- Add meta_attribution column to checkout_sessions
ALTER TABLE public.checkout_sessions ADD COLUMN IF NOT EXISTS meta_attribution JSONB;
