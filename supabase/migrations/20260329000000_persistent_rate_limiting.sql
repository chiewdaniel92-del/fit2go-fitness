-- Persistent rate limiting table for edge functions.
-- Replaces in-memory Map which resets on every cold start.

CREATE TABLE IF NOT EXISTS public.rate_limit_requests (
  key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limit_requests_key_created_at_idx
  ON public.rate_limit_requests (key, created_at);

-- Only service_role can access — no public RLS policies needed
ALTER TABLE public.rate_limit_requests ENABLE ROW LEVEL SECURITY;

-- Atomic check-and-record: counts requests in window, inserts if allowed.
-- Returns whether the request is allowed and remaining quota.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_max_requests integer,
  p_window_ms bigint
)
RETURNS TABLE(allowed boolean, request_count bigint, retry_after_ms bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz;
  v_count bigint;
BEGIN
  v_window_start := now() - (p_window_ms || ' milliseconds')::interval;

  -- Prune records older than 1 hour to keep the table small
  DELETE FROM public.rate_limit_requests
  WHERE created_at < now() - interval '1 hour';

  -- Count requests for this key within the current window
  SELECT COUNT(*) INTO v_count
  FROM public.rate_limit_requests
  WHERE key = p_key AND created_at >= v_window_start;

  IF v_count < p_max_requests THEN
    INSERT INTO public.rate_limit_requests (key) VALUES (p_key);
    RETURN QUERY SELECT true, v_count + 1, p_window_ms;
  ELSE
    RETURN QUERY SELECT false, v_count, p_window_ms;
  END IF;
END;
$$;

-- Only service_role can call this (edge functions use the service role key)
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, bigint) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, bigint) TO service_role;
