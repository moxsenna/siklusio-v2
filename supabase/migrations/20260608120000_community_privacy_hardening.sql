-- Community column-level SELECT hardening (anonymous privacy)
-- Idempotent: REVOKE/GRANT statements are safe to re-run.

-- ---------- 1. community_posts Hardening ----------
REVOKE SELECT ON TABLE public.community_posts FROM authenticated;
REVOKE SELECT ON TABLE public.community_posts FROM public;

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
REVOKE SELECT ON TABLE public.community_comments FROM authenticated;
REVOKE SELECT ON TABLE public.community_comments FROM public;

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
GRANT SELECT ON public.community_posts TO service_role;
GRANT SELECT ON public.community_comments TO service_role;