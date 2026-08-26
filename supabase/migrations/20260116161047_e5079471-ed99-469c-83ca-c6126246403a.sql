-- Add SELECT policy to kb_versions for active versions only
-- This allows the edge function to query active KB version metadata
CREATE POLICY "Anyone can view active KB versions"
ON public.kb_versions
FOR SELECT
USING (is_active = true);

-- Add SELECT policy for fit2go_kb_chunks through the active version relationship
-- This ensures chunks are only accessible when the version is active
CREATE POLICY "Anyone can view KB chunks from active versions"
ON public.fit2go_kb_chunks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.kb_versions v 
    WHERE v.id = version_id AND v.is_active = true
  )
);