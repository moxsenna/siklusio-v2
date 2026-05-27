-- ============================================================
-- Safe comments RPC for community posts
-- Run AFTER community.sql and community_avatar.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_post_comments(
  p_post_id UUID
)
RETURNS TABLE (
  id UUID,
  post_id UUID,
  content TEXT,
  is_anonymous BOOLEAN,
  is_hidden BOOLEAN,
  hidden_reason TEXT,
  report_count INTEGER,
  created_at TIMESTAMPTZ,
  display_name TEXT,
  avatar_url TEXT,
  is_own BOOLEAN
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.post_id,
    c.content,
    c.is_anonymous,
    c.is_hidden,
    c.hidden_reason,
    c.report_count,
    c.created_at,
    CASE
      WHEN c.is_anonymous THEN 'Anonim'
      ELSE COALESCE(NULLIF(p.nickname, ''), NULLIF(p.name, ''), 'Pengguna')
    END AS display_name,
    CASE
      WHEN c.is_anonymous THEN NULL
      ELSE p.avatar_url
    END AS avatar_url,
    (c.user_id = auth.uid()) AS is_own
  FROM public.community_comments c
  LEFT JOIN public.profiles p ON p.id = c.user_id
  WHERE auth.uid() IS NOT NULL
    AND c.post_id = p_post_id
    AND (c.is_hidden = FALSE OR c.user_id = auth.uid() OR public.is_admin(auth.uid()))
  ORDER BY c.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.get_post_comments(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_post_comments(UUID) TO authenticated;
