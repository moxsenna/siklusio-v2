-- ============================================================
-- Community Feature Schema
-- Run AFTER schema.sql (depends on profiles table)
-- ============================================================

-- ------------------------------------------------------------
-- 0. Extend profiles with admin flag
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Helper to check admin (used by RLS). SECURITY DEFINER avoids RLS recursion.
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = uid),
    FALSE
  );
$$;

-- ============================================================
-- 1. POSTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  -- Optional phase tag: 'Menstrual' | 'Folikular' | 'Ovulasi' | 'Luteal' | NULL
  phase_tag TEXT,
  -- Moderation
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  hidden_reason TEXT, -- 'auto_reports' | 'admin_action' | 'self_delete' | NULL
  report_count INTEGER NOT NULL DEFAULT 0,
  admin_reviewed_at TIMESTAMPTZ,
  admin_review_status TEXT, -- NULL | 'kept' | 'removed'
  -- Denormalized counters for cheap reads (synced via triggers)
  comment_count INTEGER NOT NULL DEFAULT 0,
  reaction_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT content_length_check CHECK (
    char_length(content) > 0 AND char_length(content) <= 500
  ),
  CONSTRAINT phase_tag_check CHECK (
    phase_tag IS NULL OR phase_tag IN ('Menstrual', 'Folikular', 'Ovulasi', 'Luteal')
  )
);

CREATE INDEX IF NOT EXISTS idx_community_posts_created_at
  ON public.community_posts (created_at DESC)
  WHERE is_hidden = FALSE;

CREATE INDEX IF NOT EXISTS idx_community_posts_user_id
  ON public.community_posts (user_id);

-- ============================================================
-- 2. COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.community_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  hidden_reason TEXT,
  report_count INTEGER NOT NULL DEFAULT 0,
  admin_reviewed_at TIMESTAMPTZ,
  admin_review_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT comment_length_check CHECK (
    char_length(content) > 0 AND char_length(content) <= 300
  )
);

CREATE INDEX IF NOT EXISTS idx_community_comments_post
  ON public.community_comments (post_id, created_at ASC)
  WHERE is_hidden = FALSE;

CREATE INDEX IF NOT EXISTS idx_community_comments_user
  ON public.community_comments (user_id);

-- ============================================================
-- 3. REACTIONS (5 fixed emoji types)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.community_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reaction_type_check CHECK (
    reaction_type IN ('hug', 'pray', 'sad', 'strong', 'me_too')
  ),
  UNIQUE (post_id, user_id, reaction_type)
);
-- 'hug'=💖 'pray'=🙏 'sad'=😢 'strong'=💪 'me_too'=🤝

CREATE INDEX IF NOT EXISTS idx_community_reactions_post
  ON public.community_reactions (post_id);

-- ============================================================
-- 4. REPORTS (1 user = 1 report per target)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.community_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT target_type_check CHECK (target_type IN ('post', 'comment')),
  CONSTRAINT report_status_check CHECK (
    status IN ('pending', 'resolved_hide', 'resolved_keep')
  ),
  UNIQUE (target_type, target_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_community_reports_pending
  ON public.community_reports (created_at DESC)
  WHERE status = 'pending';

-- ============================================================
-- 5. TRIGGERS
-- ============================================================

-- 5a. Updated_at on posts
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_posts_updated_at ON public.community_posts;
CREATE TRIGGER trg_community_posts_updated_at
  BEFORE UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5b. Maintain comment_count on posts
CREATE OR REPLACE FUNCTION public.community_comments_count_trigger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
      SET comment_count = comment_count + 1
      WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts
      SET comment_count = GREATEST(comment_count - 1, 0)
      WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_comments_count ON public.community_comments;
CREATE TRIGGER trg_community_comments_count
  AFTER INSERT OR DELETE ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.community_comments_count_trigger();

-- 5c. Maintain reaction_count on posts
CREATE OR REPLACE FUNCTION public.community_reactions_count_trigger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
      SET reaction_count = reaction_count + 1
      WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts
      SET reaction_count = GREATEST(reaction_count - 1, 0)
      WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_reactions_count ON public.community_reactions;
CREATE TRIGGER trg_community_reactions_count
  AFTER INSERT OR DELETE ON public.community_reactions
  FOR EACH ROW EXECUTE FUNCTION public.community_reactions_count_trigger();

-- 5d. Auto-hide on >= 10 reports + maintain report_count
CREATE OR REPLACE FUNCTION public.community_reports_after_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  new_count INTEGER;
BEGIN
  IF NEW.target_type = 'post' THEN
    UPDATE public.community_posts
      SET report_count = report_count + 1
      WHERE id = NEW.target_id
      RETURNING report_count INTO new_count;

    -- Auto-hide once threshold reached and admin has not reviewed yet
    IF new_count IS NOT NULL AND new_count >= 10 THEN
      UPDATE public.community_posts
        SET is_hidden = TRUE,
            hidden_reason = 'auto_reports'
        WHERE id = NEW.target_id
          AND is_hidden = FALSE
          AND admin_reviewed_at IS NULL;
    END IF;

  ELSIF NEW.target_type = 'comment' THEN
    UPDATE public.community_comments
      SET report_count = report_count + 1
      WHERE id = NEW.target_id
      RETURNING report_count INTO new_count;

    IF new_count IS NOT NULL AND new_count >= 10 THEN
      UPDATE public.community_comments
        SET is_hidden = TRUE,
            hidden_reason = 'auto_reports'
        WHERE id = NEW.target_id
          AND is_hidden = FALSE
          AND admin_reviewed_at IS NULL;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_reports_insert ON public.community_reports;
CREATE TRIGGER trg_community_reports_insert
  AFTER INSERT ON public.community_reports
  FOR EACH ROW EXECUTE FUNCTION public.community_reports_after_insert();

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================
ALTER TABLE public.community_posts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reports   ENABLE ROW LEVEL SECURITY;

-- ---------- POSTS ----------
-- Read: visible to all authenticated unless hidden; author always sees own; admin sees all
CREATE POLICY "posts_select"
  ON public.community_posts FOR SELECT
  TO authenticated
  USING (
    is_hidden = FALSE
    OR user_id = auth.uid()
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "posts_insert"
  ON public.community_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND is_hidden = FALSE
    AND report_count = 0
    AND admin_reviewed_at IS NULL
    AND admin_review_status IS NULL
  );

-- Author can only update their own content / anonymous flag (NOT moderation fields)
CREATE POLICY "posts_update_owner"
  ON public.community_posts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin can update moderation fields on any row
CREATE POLICY "posts_update_admin"
  ON public.community_posts FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "posts_delete_owner"
  ON public.community_posts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ---------- COMMENTS ----------
CREATE POLICY "comments_select"
  ON public.community_comments FOR SELECT
  TO authenticated
  USING (
    is_hidden = FALSE
    OR user_id = auth.uid()
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "comments_insert"
  ON public.community_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND is_hidden = FALSE
    AND report_count = 0
  );

CREATE POLICY "comments_update_owner"
  ON public.community_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "comments_update_admin"
  ON public.community_comments FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "comments_delete_owner"
  ON public.community_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ---------- REACTIONS ----------
CREATE POLICY "reactions_select"
  ON public.community_reactions FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "reactions_insert"
  ON public.community_reactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reactions_delete_owner"
  ON public.community_reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ---------- REPORTS ----------
-- Reporters see their own reports; admins see all
CREATE POLICY "reports_select"
  ON public.community_reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "reports_insert"
  ON public.community_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    AND status = 'pending'
  );

-- Only admin can update reports (resolve them)
CREATE POLICY "reports_update_admin"
  ON public.community_reports FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================
-- 7. FEED HELPER (cursor pagination, joins nickname / "Anonim")
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_community_feed(
  page_size INTEGER DEFAULT 10,
  before TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  display_name TEXT,
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
SECURITY INVOKER
AS $$
  SELECT
    p.id,
    p.content,
    CASE
      WHEN p.is_anonymous THEN 'Anonim'
      ELSE COALESCE(NULLIF(prof.nickname, ''), 'Pengguna')
    END AS display_name,
    p.is_anonymous,
    p.phase_tag,
    p.comment_count,
    p.reaction_count,
    p.created_at,
    (p.user_id = auth.uid()) AS is_own,
    p.is_hidden
  FROM public.community_posts p
  LEFT JOIN public.profiles prof ON prof.id = p.user_id
  WHERE (p.is_hidden = FALSE OR p.user_id = auth.uid())
    AND (before IS NULL OR p.created_at < before)
  ORDER BY p.created_at DESC
  LIMIT LEAST(GREATEST(page_size, 1), 50);
$$;

GRANT EXECUTE ON FUNCTION public.get_community_feed(INTEGER, TIMESTAMPTZ)
  TO authenticated;
