-- Add explicit UPDATE and DELETE blocking policies for assessments table
-- This is defense-in-depth since updates are handled via SECURITY DEFINER RPCs
-- but prevents any direct manipulation attempts

-- Block all direct UPDATE access
CREATE POLICY "No public UPDATE on assessments" 
ON public.assessments 
FOR UPDATE 
USING (false);

-- Block all direct DELETE access  
CREATE POLICY "No public DELETE on assessments" 
ON public.assessments 
FOR DELETE 
USING (false);