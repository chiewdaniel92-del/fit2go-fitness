-- Ensure analytics_events table has no public SELECT access
-- RLS is already enabled, this adds explicit policy for clarity and defense-in-depth
DO $$
BEGIN
  -- Drop existing SELECT policy if any exists
  DROP POLICY IF EXISTS "Block all SELECT on analytics_events" ON public.analytics_events;
  DROP POLICY IF EXISTS "Deny all SELECT on analytics_events" ON public.analytics_events;
END $$;

-- Create restrictive policy that blocks all SELECT access
-- Using (false) ensures no rows can ever be selected
CREATE POLICY "No public SELECT on analytics_events" 
ON public.analytics_events 
FOR SELECT 
USING (false);

-- Ensure assessments table has no public SELECT access
-- Access is only through get_assessment_by_token() RPC function
DO $$
BEGIN
  DROP POLICY IF EXISTS "Block all SELECT on assessments" ON public.assessments;
  DROP POLICY IF EXISTS "Deny all SELECT on assessments" ON public.assessments;
END $$;

-- Create restrictive policy that blocks all SELECT access
CREATE POLICY "No public SELECT on assessments" 
ON public.assessments 
FOR SELECT 
USING (false);