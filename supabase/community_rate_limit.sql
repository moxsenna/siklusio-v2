-- ============================================================
-- Rate limiting for community posts & comments
-- Run AFTER community.sql and community_admin.sql
--
-- Rules (per non-admin user):
--   POSTS    : max 5 per hour, min 30s cooldown between consecutive
--   COMMENTS : max 20 per hour, min 10s cooldown between consecutive
--
-- Admins are exempt (so moderation/announcement traffic isn't blocked).
-- Errors use SQLSTATE 'P0001' with a structured message that the client
-- parses to show a friendly Indonesian message.
-- ============================================================

CREATE OR REPLACE FUNCTION public.community_post_rate_limit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  recent_count INT;
  last_at TIMESTAMPTZ;
  seconds_since NUMERIC;
  wait_secs INT;
BEGIN
  IF public.is_admin(NEW.user_id) THEN
    RETURN NEW;
  END IF;

  -- Hourly cap
  SELECT COUNT(*) INTO recent_count
  FROM public.community_posts
  WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '1 hour';

  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'rate_limit:post_hourly:Batas 5 postingan per jam terlampaui. Tunggu beberapa saat lagi.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Per-user cooldown
  SELECT MAX(created_at) INTO last_at
  FROM public.community_posts
  WHERE user_id = NEW.user_id;

  IF last_at IS NOT NULL THEN
    seconds_since := EXTRACT(EPOCH FROM (NOW() - last_at));
    IF seconds_since < 30 THEN
      wait_secs := CEIL(30 - seconds_since);
      RAISE EXCEPTION 'rate_limit:post_cooldown:%:Tunggu % detik sebelum membuat postingan baru.',
        wait_secs, wait_secs
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_post_rate_limit ON public.community_posts;
CREATE TRIGGER trg_community_post_rate_limit
  BEFORE INSERT ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.community_post_rate_limit();


CREATE OR REPLACE FUNCTION public.community_comment_rate_limit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  recent_count INT;
  last_at TIMESTAMPTZ;
  seconds_since NUMERIC;
  wait_secs INT;
BEGIN
  IF public.is_admin(NEW.user_id) THEN
    RETURN NEW;
  END IF;

  -- Hourly cap
  SELECT COUNT(*) INTO recent_count
  FROM public.community_comments
  WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '1 hour';

  IF recent_count >= 20 THEN
    RAISE EXCEPTION 'rate_limit:comment_hourly:Batas 20 komentar per jam terlampaui. Tunggu beberapa saat lagi.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Per-user cooldown
  SELECT MAX(created_at) INTO last_at
  FROM public.community_comments
  WHERE user_id = NEW.user_id;

  IF last_at IS NOT NULL THEN
    seconds_since := EXTRACT(EPOCH FROM (NOW() - last_at));
    IF seconds_since < 10 THEN
      wait_secs := CEIL(10 - seconds_since);
      RAISE EXCEPTION 'rate_limit:comment_cooldown:%:Tunggu % detik sebelum berkomentar lagi.',
        wait_secs, wait_secs
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_comment_rate_limit ON public.community_comments;
CREATE TRIGGER trg_community_comment_rate_limit
  BEFORE INSERT ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.community_comment_rate_limit();
