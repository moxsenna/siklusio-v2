-- ============================================================
-- Admin extensions for moderation dashboard
-- Run AFTER community.sql
-- ============================================================

-- Allow admins to SELECT every profile (needed for moderation queue
-- to show author nickname / name on reported items).
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================================
-- Moderation RPC: keep/remove a reported target atomically.
-- Action 'keep'   -> unhide, mark reviewed, resolve reports as resolved_keep
-- Action 'remove' -> hide,  mark reviewed, resolve reports as resolved_hide
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_moderate_target(
  p_target_type TEXT,
  p_target_id UUID,
  p_action TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_is_admin BOOLEAN := public.is_admin(v_uid);
  v_new_hidden BOOLEAN;
  v_new_status TEXT;
  v_report_status TEXT;
BEGIN
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'forbidden: admin access required';
  END IF;

  IF p_target_type NOT IN ('post', 'comment') THEN
    RAISE EXCEPTION 'invalid target_type: %', p_target_type;
  END IF;

  IF p_action = 'keep' THEN
    v_new_hidden := FALSE;
    v_new_status := 'kept';
    v_report_status := 'resolved_keep';
  ELSIF p_action = 'remove' THEN
    v_new_hidden := TRUE;
    v_new_status := 'removed';
    v_report_status := 'resolved_hide';
  ELSE
    RAISE EXCEPTION 'invalid action: %', p_action;
  END IF;

  IF p_target_type = 'post' THEN
    UPDATE public.community_posts
       SET is_hidden = v_new_hidden,
           hidden_reason = CASE WHEN v_new_hidden THEN 'admin_action' ELSE NULL END,
           admin_reviewed_at = NOW(),
           admin_review_status = v_new_status
     WHERE id = p_target_id;
  ELSE
    UPDATE public.community_comments
       SET is_hidden = v_new_hidden,
           hidden_reason = CASE WHEN v_new_hidden THEN 'admin_action' ELSE NULL END,
           admin_reviewed_at = NOW(),
           admin_review_status = v_new_status
     WHERE id = p_target_id;
  END IF;

  UPDATE public.community_reports
     SET status = v_report_status,
         resolved_at = NOW(),
         resolver_id = v_uid
   WHERE target_type = p_target_type
     AND target_id = p_target_id
     AND status = 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_moderate_target(TEXT, UUID, TEXT) TO authenticated;
