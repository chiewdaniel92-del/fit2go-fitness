-- Extensions the later migrations depend on.
--
-- These were previously enabled by hand in the Supabase dashboard, so the
-- migrations below assumed they already existed and failed on a fresh project:
--
--   pgcrypto -> gen_random_bytes(), used for assessments.access_token
--   vector   -> vector(1536) columns and the <=> operator for KB similarity search
--
-- Both are installed into `public` rather than the `extensions` schema on
-- purpose: the later migrations reference gen_random_bytes() and vector(1536)
-- unqualified, so the objects have to sit somewhere that is on the search_path
-- no matter which session runs the migration.

do $$
declare
  ext text;
  current_schema_name text;
begin
  foreach ext in array array['pgcrypto', 'vector'] loop
    select n.nspname into current_schema_name
      from pg_extension e
      join pg_namespace n on n.oid = e.extnamespace
     where e.extname = ext;

    if current_schema_name is null then
      execute format('create extension %I with schema public', ext);
    elsif current_schema_name <> 'public' then
      execute format('alter extension %I set schema public', ext);
    end if;
  end loop;
end
$$;
