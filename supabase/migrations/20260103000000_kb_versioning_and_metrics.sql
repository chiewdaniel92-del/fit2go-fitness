-- KB versioning, vector search, and assessment metrics

create extension if not exists pgcrypto;
create extension if not exists vector;

create table public.kb_versions (
  id uuid primary key default gen_random_uuid(),
  version_label text not null,
  storage_path text not null,
  notes text,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index kb_versions_active_idx
  on public.kb_versions (is_active)
  where is_active;

alter table public.kb_versions enable row level security;

create table public.kynare_kb_chunks (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.kb_versions(id) on delete cascade,
  chunk_index integer not null,
  section text,
  page integer,
  content text not null,
  token_count integer,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index kynare_kb_chunks_version_idx
  on public.kynare_kb_chunks (version_id);

create index kynare_kb_chunks_embedding_idx
  on public.kynare_kb_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

alter table public.kynare_kb_chunks enable row level security;

create or replace function public.match_kynare_knowledge(
  p_version_id uuid,
  p_query_embedding vector(1536),
  p_match_count integer default 10
)
returns table (
  id uuid,
  content text,
  section text,
  page integer,
  similarity float
)
language sql
stable
as $$
  select
    c.id,
    c.content,
    c.section,
    c.page,
    1 - (c.embedding <=> p_query_embedding) as similarity
  from public.kynare_kb_chunks c
  where c.version_id = p_version_id
  order by c.embedding <=> p_query_embedding
  limit p_match_count;
$$;

create table public.assessment_kb_logs (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  kb_version_id uuid references public.kb_versions(id) on delete set null,
  kb_chunk_id uuid references public.kynare_kb_chunks(id) on delete set null,
  similarity float,
  created_at timestamptz not null default now()
);

create index assessment_kb_logs_assessment_idx
  on public.assessment_kb_logs (assessment_id);

alter table public.assessment_kb_logs enable row level security;

create policy "Anyone can insert assessment kb logs"
  on public.assessment_kb_logs
  for insert
  with check (true);

alter table public.assessments
  add column kb_version_id uuid references public.kb_versions(id),
  add column bss_score smallint,
  add column lrb_score smallint,
  add column pcc_score smallint,
  add column sis_score smallint,
  add column oas_score smallint;

alter table public.assessments
  add constraint assessments_bss_score_range
    check (bss_score is null or (bss_score >= 1 and bss_score <= 5)),
  add constraint assessments_lrb_score_range
    check (lrb_score is null or (lrb_score >= 1 and lrb_score <= 5)),
  add constraint assessments_pcc_score_range
    check (pcc_score is null or (pcc_score >= 1 and pcc_score <= 5)),
  add constraint assessments_sis_score_range
    check (sis_score is null or (sis_score >= 1 and sis_score <= 5)),
  add constraint assessments_oas_score_range
    check (oas_score is null or (oas_score >= 1 and oas_score <= 5));
