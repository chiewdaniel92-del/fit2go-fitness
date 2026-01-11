-- Lock down public access and expose safe RPCs for assessment reads/updates

-- Remove overly-permissive public read/update policies
DROP POLICY IF EXISTS "Anyone can view assessment by access token" ON public.assessments;
DROP POLICY IF EXISTS "Anyone can update assessments" ON public.assessments;

-- Safe read by access token (sanitized fields only)
CREATE OR REPLACE FUNCTION public.get_assessment_by_token(p_access_token text)
RETURNS TABLE (
  id uuid,
  age integer,
  primary_goal_label text,
  current_state_label text,
  ai_assessment text,
  created_at timestamptz,
  completed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.age,
    pg.label AS primary_goal_label,
    cs.label AS current_state_label,
    a.ai_assessment,
    a.created_at,
    a.completed_at
  FROM public.assessments a
  JOIN public.assessment_options_primary_goal pg ON pg.id = a.primary_goal_id
  JOIN public.assessment_options_current_state cs ON cs.id = a.current_state_id
  WHERE a.access_token = p_access_token
  LIMIT 1;
$$;

-- Insert assessment and return access token without exposing table rows
CREATE OR REPLACE FUNCTION public.create_assessment(
  p_age integer,
  p_primary_goal_id uuid,
  p_current_state_id uuid,
  p_voice_transcript text,
  p_ai_assessment text,
  p_ai_recommendations jsonb,
  p_kb_version_id uuid,
  p_bss_score smallint,
  p_lrb_score smallint,
  p_pcc_score smallint,
  p_sis_score smallint,
  p_oas_score smallint,
  p_status text,
  p_completed_at timestamptz,
  p_completion_time_seconds integer
)
RETURNS TABLE (
  id uuid,
  access_token text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.assessments (
    age,
    primary_goal_id,
    current_state_id,
    voice_transcript,
    ai_assessment,
    ai_recommendations,
    kb_version_id,
    bss_score,
    lrb_score,
    pcc_score,
    sis_score,
    oas_score,
    status,
    completed_at,
    completion_time_seconds
  )
  VALUES (
    p_age,
    p_primary_goal_id,
    p_current_state_id,
    p_voice_transcript,
    p_ai_assessment,
    p_ai_recommendations,
    p_kb_version_id,
    p_bss_score,
    p_lrb_score,
    p_pcc_score,
    p_sis_score,
    p_oas_score,
    COALESCE(p_status, 'completed'),
    p_completed_at,
    p_completion_time_seconds
  )
  RETURNING assessments.id, assessments.access_token;
$$;

-- Update only safe fields using access token
CREATE OR REPLACE FUNCTION public.update_assessment_by_token(
  p_access_token text,
  p_email text,
  p_status text,
  p_completed_at timestamptz,
  p_honeypot_triggered boolean,
  p_completion_time_seconds integer
)
RETURNS TABLE (
  id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.assessments
  SET
    email = p_email,
    status = p_status,
    completed_at = p_completed_at,
    honeypot_triggered = p_honeypot_triggered,
    completion_time_seconds = p_completion_time_seconds
  WHERE access_token = p_access_token
  RETURNING id;
$$;

GRANT EXECUTE ON FUNCTION public.get_assessment_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_assessment(integer, uuid, uuid, text, text, jsonb, uuid, smallint, smallint, smallint, smallint, smallint, text, timestamptz, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_assessment_by_token(text, text, text, timestamptz, boolean, integer) TO anon, authenticated;

-- Reduce direct exposure for analytics data
REVOKE SELECT, UPDATE, DELETE ON public.analytics_events FROM anon, authenticated;