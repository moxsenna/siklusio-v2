-- Close remaining anon table-level SELECT gap for community privacy.
-- Reason:
-- anon still had table-level SELECT on community_posts/community_comments,
-- which implicitly allowed reading user_id despite column-level revoke.
--
-- Strategy:
-- 1. Revoke table-level SELECT from anon.
-- 2. Grant back only safe public columns, excluding user_id.
-- 3. Keep service_role/postgres unaffected.
-- 4. Do not change INSERT/UPDATE/DELETE or authenticated grants in this hotfix.

REVOKE SELECT ON TABLE public.community_posts FROM anon;
REVOKE SELECT ON TABLE public.community_comments FROM anon;

-- Safe columns aligned with 20260608120000_community_privacy_hardening.sql (production schema).
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
) ON public.community_posts TO anon;

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
) ON public.community_comments TO anon;