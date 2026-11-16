-- Marketing → Video library: each company keeps its own marketing videos (and pictures),
-- with caption, hashtags, platforms, status and a planned post date.
-- Files live in a private bucket under <business_id>/…; rows are read and written only through
-- /api/marketing-videos with the service role. Safe to run twice.

create table if not exists public.marketing_videos (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  title text not null,
  caption text,
  hashtags text,
  platforms text[] not null default '{}',
  status text not null default 'Draft',            -- Draft, Ready, Scheduled, Posted
  scheduled_for timestamptz,
  posted_at timestamptz,
  posted_platforms text[] not null default '{}',
  notes text,
  file_path text not null,
  file_name text,
  mime text,
  size_bytes bigint,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists marketing_videos_business_idx on public.marketing_videos (business_id, created_at desc);
alter table public.marketing_videos enable row level security;

-- Private bucket. Large files go straight from the browser to storage with a signed upload link.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marketing-videos', 'marketing-videos', false, 524288000,
  array['video/mp4','video/quicktime','video/webm','video/x-m4v','image/jpeg','image/png','image/webp'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
