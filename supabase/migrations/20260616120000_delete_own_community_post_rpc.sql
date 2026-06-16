-- ============================================================
-- SECURITY DEFINER wrapper for deleting own community posts.
--
-- The privacy-hardening migration (20260608120000) revoked
-- SELECT(user_id) from authenticated, which broke direct
-- DELETE operations on community_posts because:
--   1. Client code uses .eq("user_id", userId) in the filter
--   2. The RLS delete policy references user_id = auth.uid()
-- Both require SELECT on user_id, which is no longer granted.
--
-- This function runs as SECURITY DEFINER (table owner privileges)
-- and checks auth.uid() internally, so the client never needs
-- SELECT access to user_id.
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_own_community_post(
  p_post_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  DELETE FROM public.community_posts
  WHERE id = p_post_id
    AND user_id = auth.uid();

  -- If no row was deleted, either the post doesn't exist or the user
  -- is not the owner. Both cases are a no-op (not an error).
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_community_post(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_own_community_post(UUID) TO authenticated, service_role;
