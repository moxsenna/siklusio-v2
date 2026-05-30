-- ============================================================
-- Add unique constraint to cycle_guides for idempotency
-- Run after supabase/cycle_guides.sql
-- ============================================================

ALTER TABLE public.cycle_guides
ADD CONSTRAINT cycle_guides_user_date_status_key UNIQUE (user_id, generated_for_date, status);
