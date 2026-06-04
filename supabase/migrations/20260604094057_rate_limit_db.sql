-- Create rate_limits table for DB-level rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Note: Since no public policies are created, only the service_role key (used by the Hono backend Worker) can read/write this table.

-- Atomic rate check and increment RPC function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_max INT,
  p_window_seconds INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
  v_reset_at TIMESTAMPTZ;
  v_allowed BOOLEAN;
  v_remaining INT;
  v_retry_after INT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Cleanup expired rate limits periodically (1% chance to keep table clean)
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limits WHERE reset_at < v_now;
  END IF;

  SELECT count, reset_at INTO v_count, v_reset_at
  FROM public.rate_limits
  WHERE key = p_key;

  IF NOT FOUND OR v_now >= v_reset_at THEN
    v_reset_at := v_now + (p_window_seconds || ' seconds')::INTERVAL;
    INSERT INTO public.rate_limits (key, count, reset_at)
    VALUES (p_key, 1, v_reset_at)
    ON CONFLICT (key) DO UPDATE
    SET count = 1, reset_at = v_reset_at, updated_at = NOW();
    
    RETURN jsonb_build_object(
      'allowed', TRUE,
      'remaining', p_max - 1,
      'reset_at', EXTRACT(EPOCH FROM v_reset_at)
    );
  END IF;

  IF v_count >= p_max THEN
    v_retry_after := CEIL(EXTRACT(EPOCH FROM (v_reset_at - v_now)));
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'remaining', 0,
      'reset_at', EXTRACT(EPOCH FROM v_reset_at),
      'retry_after_seconds', GREATEST(1, v_retry_after)
    );
  END IF;

  UPDATE public.rate_limits
  SET count = count + 1, updated_at = NOW()
  WHERE key = p_key;

  RETURN jsonb_build_object(
    'allowed', TRUE,
    'remaining', p_max - (v_count + 1),
    'reset_at', EXTRACT(EPOCH FROM v_reset_at)
  );
END;
$$;
