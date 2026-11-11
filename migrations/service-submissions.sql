alter table service_docs add column if not exists fillable boolean not null default false;
create table if not exists service_submissions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  link_id uuid references service_links(id) on delete cascade,
  doc_id uuid references service_docs(id) on delete set null,
  doc_title text,
  submitter_name text,
  submitter_email text,
  path text not null,
  created_at timestamptz not null default now()
);
alter table service_submissions enable row level security;
create index if not exists service_submissions_biz on service_submissions(business_id, created_at desc);
insert into storage.buckets (id,name,public) values ('service-submissions','service-submissions',false) on conflict (id) do nothing;
alter table service_links add column if not exists subject text, add column if not exists subject_id uuid, add column if not exists subject_name text;
alter table service_submissions add column if not exists lease_doc_id uuid;
