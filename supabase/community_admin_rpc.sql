-- ============================================================
-- Safe admin moderation queue RPC
-- Run AFTER community.sql and community_admin.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_get_moderation_queue(
  p_filter TEXT DEFAULT 'pending'
)
RETURNS TABLE (
  report_id UUID,
  target_type TEXT,
  target_id UUID,
  reporter_id UUID,
  reason TEXT,
  report_status TEXT,
  report_created_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  content TEXT,
  author_id UUID,
  author_label TEXT,
  author_real_label TEXT,
  author_avatar_url TEXT,
  author_avatar_kind TEXT,
  is_anonymous BOOLEAN,
  is_hidden BOOLEAN,
  report_count INTEGER,
  review_status TEXT,
  reviewed_at TIMESTAMPTZ,
  target_created_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH filtered_reports AS (
    SELECT *
    FROM public.community_reports r
    WHERE auth.uid() IS NOT NULL
      AND public.is_admin(auth.uid())
      AND (
        p_filter = 'all'
        OR (p_filter = 'pending' AND r.status = 'pending')
        OR (p_filter = 'reviewed' AND r.status IN ('resolved_hide', 'resolved_keep'))
      )
    ORDER BY r.created_at DESC
    LIMIT 200
  )
  SELECT
    r.id,
    r.target_type,
    r.target_id,
    r.reporter_id,
    r.reason,
    r.status,
    r.created_at,
    r.resolved_at,
    COALESCE(post_target.content, comment_target.content) AS content,
    COALESCE(post_target.user_id, comment_target.user_id) AS author_id,
    CASE
      WHEN COALESCE(post_target.is_anonymous, comment_target.is_anonymous) THEN 'Anonim'
      ELSE COALESCE(NULLIF(prof.nickname, ''), NULLIF(prof.name, ''), 'Pengguna')
    END AS author_label,
    COALESCE(NULLIF(prof.nickname, ''), NULLIF(prof.name, ''), 'Pengguna') AS author_real_label,
    prof.avatar_url,
    prof.avatar_kind,
    COALESCE(post_target.is_anonymous, comment_target.is_anonymous) AS is_anonymous,
    COALESCE(post_target.is_hidden, comment_target.is_hidden) AS is_hidden,
    COALESCE(post_target.report_count, comment_target.report_count) AS report_count,
    COALESCE(post_target.admin_review_status, comment_target.admin_review_status) AS review_status,
    COALESCE(post_target.admin_reviewed_at, comment_target.admin_reviewed_at) AS reviewed_at,
    COALESCE(post_target.created_at, comment_target.created_at) AS target_created_at
  FROM filtered_reports r
  LEFT JOIN public.community_posts post_target
    ON r.target_type = 'post' AND post_target.id = r.target_id
  LEFT JOIN public.community_comments comment_target
    ON r.target_type = 'comment' AND comment_target.id = r.target_id
  LEFT JOIN public.profiles prof
    ON prof.id = COALESCE(post_target.user_id, comment_target.user_id);
$$;

REVOKE ALL ON FUNCTION public.admin_get_moderation_queue(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_get_moderation_queue(TEXT) TO authenticated;
