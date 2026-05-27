-- ============================================================
-- Avatar support for profiles
-- Run AFTER community.sql and community_admin.sql
-- ============================================================

-- avatar_kind: 'preset' (built-in id) | 'custom' (uploaded URL) | NULL (use default)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS avatar_kind TEXT;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_avatar_kind_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_avatar_kind_check
  CHECK (avatar_kind IS NULL OR avatar_kind IN ('preset', 'custom'));

-- Update feed RPC to surface avatar info (NULL if anonymous post).
-- Postgres tidak izinkan CREATE OR REPLACE mengubah return signature,
-- jadi kita DROP dulu function lama (aman karena pasti ter-recreate di bawah).
DROP FUNCTION IF EXISTS public.get_community_feed(INTEGER, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.get_community_feed(
  page_size INTEGER DEFAULT 10,
  before TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  display_name TEXT,
  avatar_url TEXT,
  is_anonymous BOOLEAN,
  phase_tag TEXT,
  comment_count INTEGER,
  reaction_count INTEGER,
  created_at TIMESTAMPTZ,
  is_own BOOLEAN,
  is_hidden BOOLEAN
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.content,
    CASE
      WHEN p.is_anonymous THEN 'Anonim'
      ELSE COALESCE(NULLIF(prof.nickname, ''), 'Pengguna')
    END AS display_name,
    CASE
      WHEN p.is_anonymous THEN NULL
      ELSE prof.avatar_url
    END AS avatar_url,
    p.is_anonymous,
    p.phase_tag,
    p.comment_count,
    p.reaction_count,
    p.created_at,
    (p.user_id = auth.uid()) AS is_own,
    p.is_hidden
  FROM public.community_posts p
  LEFT JOIN public.profiles prof ON prof.id = p.user_id
  WHERE auth.uid() IS NOT NULL
    AND (p.is_hidden = FALSE OR p.user_id = auth.uid())
    AND (before IS NULL OR p.created_at < before)
  ORDER BY p.created_at DESC
  LIMIT LEAST(GREATEST(page_size, 1), 50);
$$;

REVOKE ALL ON FUNCTION public.get_community_feed(INTEGER, TIMESTAMPTZ) FROM public;
GRANT EXECUTE ON FUNCTION public.get_community_feed(INTEGER, TIMESTAMPTZ)
  TO authenticated;


-- ============================================================
-- Admin: reset avatar a user (mis. avatar custom yang melanggar)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_reset_user_avatar(
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: admin access required';
  END IF;

  UPDATE public.profiles
     SET avatar_url = NULL,
         avatar_kind = NULL
   WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_user_avatar(UUID) TO authenticated;
