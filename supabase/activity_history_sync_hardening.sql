-- Ensure activity_history.updated_at changes whenever a daily log row is updated.
-- This supports device conflict resolution for Siklusio activity history sync.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activity_history_updated_at ON public.activity_history;
CREATE TRIGGER trg_activity_history_updated_at
  BEFORE UPDATE ON public.activity_history
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
