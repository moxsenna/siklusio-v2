-- ============================================================
-- Column-Level Select Hardening for Anonymous Privacy
-- Run AFTER community.sql
-- ============================================================

-- ---------- 1. community_posts Hardening ----------
-- Revoke all direct selects on community_posts from authenticated/public roles
REVOKE SELECT ON TABLE public.community_posts FROM authenticated;
REVOKE SELECT ON TABLE public.community_posts FROM public;

-- Grant column-specific SELECT to authenticated users (EXCLUDING user_id)
GRANT SELECT (
  id,
  content,
  is_anonymous,
  phase_tag,
  is_hidden,
  hidden_reason,
  report_count,
  admin_reviewed_at,
  admin_review_status,
  comment_count,
  reaction_count,
  created_at,
  updated_at
) ON public.community_posts TO authenticated;


-- ---------- 2. community_comments Hardening ----------
-- Revoke all direct selects on community_comments from authenticated/public roles
REVOKE SELECT ON TABLE public.community_comments FROM authenticated;
REVOKE SELECT ON TABLE public.community_comments FROM public;

-- Grant column-specific SELECT to authenticated users (EXCLUDING user_id)
GRANT SELECT (
  id,
  post_id,
  content,
  is_anonymous,
  is_hidden,
  hidden_reason,
  report_count,
  admin_reviewed_at,
  admin_review_status,
  created_at
) ON public.community_comments TO authenticated;


-- ---------- 3. Admin & System Bypass ----------
-- Ensure system roles and admins have full access to both tables bypass RLS
GRANT SELECT ON public.community_posts TO service_role;
GRANT SELECT ON public.community_comments TO service_role;
