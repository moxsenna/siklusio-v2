-- Revoke direct anon access to sensitive community ownership columns.
-- This closes the remaining column-level privacy gap after
-- 20260608120000_community_privacy_hardening.sql.

REVOKE SELECT (user_id)
ON TABLE public.community_posts
FROM anon;

REVOKE SELECT (user_id)
ON TABLE public.community_comments
FROM anon;