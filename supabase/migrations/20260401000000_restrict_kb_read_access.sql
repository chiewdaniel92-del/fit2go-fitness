-- Remove public read access to the knowledge base.
--
-- 20260116161047 added these two policies with the comment "allows the edge
-- function to query active KB version metadata", but the edge functions connect
-- with SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS altogether -- they never
-- needed a policy. Because the policies name no role, they applied to PUBLIC,
-- so anon could read the entire knowledge base with the publishable key that
-- ships in the client bundle.
--
-- This went unnoticed while the tables carried no grants at all; once the
-- migration role's missing grants were restored, the policies became live.
--
-- Dropping them leaves both tables with RLS enabled and no permissive policy:
-- unreadable by anon/authenticated, fully readable by the service role.

drop policy if exists "Anyone can view active KB versions" on public.kb_versions;
drop policy if exists "Anyone can view KB chunks from active versions" on public.fit2go_kb_chunks;
