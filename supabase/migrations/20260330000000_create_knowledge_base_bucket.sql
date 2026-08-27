-- Storage bucket holding the knowledge base source document.
--
-- scripts/ingest_kb.py records a storage path alongside each KB version, and
-- the bucket previously had to be created by hand in the dashboard. Creating it
-- here keeps a fresh project reproducible from migrations alone.
--
-- Private on purpose: the KB is client material and is only read server-side
-- via the service role.

insert into storage.buckets (id, name, public)
values ('knowledge-base', 'knowledge-base', false)
on conflict (id) do nothing;
