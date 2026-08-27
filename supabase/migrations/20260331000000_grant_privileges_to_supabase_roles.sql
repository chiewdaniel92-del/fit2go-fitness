-- Grant the standard Supabase roles access to the tables these migrations create.
--
-- Supabase's ALTER DEFAULT PRIVILEGES is configured for objects created by the
-- `postgres` role (the dashboard SQL editor). The CLI applies migrations under a
-- separate migration login role, so tables created by `supabase db push` land
-- with no grants at all and every request fails with:
--
--   42501: permission denied for table kb_versions
--
-- Row Level Security is enabled on all eight tables, so it -- not the grants --
-- remains the access control boundary for anon/authenticated. Tables carrying
-- client-confidential data (fit2go_kb_chunks, kb_versions) have RLS enabled with
-- no permissive policy, so they stay unreadable regardless of these grants.

grant usage on schema public to anon, authenticated, service_role;

-- Tables and sequences: RLS is the gate, so mirror Supabase's own defaults.
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

-- Routines are NOT granted to anon/authenticated here on purpose: functions run
-- as SECURITY DEFINER and bypass RLS, and match_fit2go_kb_chunks would hand out
-- the knowledge base. The migrations grant EXECUTE explicitly where anon needs it.
grant all on all routines in schema public to service_role;

-- Keep future migrations from reintroducing the same problem.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on routines to service_role;
