ALTER TABLE public.pending_registrations
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Existing pending rows were created by the old plaintext-password flow.
-- They cannot be safely completed after removing the password column, so
-- remove them instead of preserving secret-dependent state.
DELETE FROM public.pending_registrations
WHERE user_id IS NULL;

ALTER TABLE public.pending_registrations
  ALTER COLUMN user_id SET NOT NULL,
  DROP COLUMN IF EXISTS password;

CREATE INDEX IF NOT EXISTS idx_pending_registrations_user_id
  ON public.pending_registrations(user_id);
