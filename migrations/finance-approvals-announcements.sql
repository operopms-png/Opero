-- Staff Centre: Approvals (Finance → Approvals) and Announcements (Team → Announcements).
-- Read/written only through /api/approvals and /api/announcements (service role; RLS on, no policies).
create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  created_at timestamptz not null default now(),
  kind text not null default 'expense',        -- expense | refund | discount | purchase | other
  title text not null,
  details text,
  amount numeric,
  currency text default 'JMD',
  module text,                                  -- vr | pm | ea | dev | company
  property text,
  receipt_url text,
  requested_by text not null,
  requested_email text,
  status text not null default 'pending',       -- pending | approved | rejected
  decided_by text,
  decided_at timestamptz,
  decision_note text
);
create index if not exists approvals_business_idx on public.approvals (business_id, created_at desc);
alter table public.approvals enable row level security;

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  created_at timestamptz not null default now(),
  title text not null,
  body text,
  pinned boolean not null default true,
  author text,
  expires_on date
);
create index if not exists announcements_business_idx on public.announcements (business_id, created_at desc);
alter table public.announcements enable row level security;

create table if not exists public.announcement_reads (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_email text not null,
  read_at timestamptz not null default now(),
  primary key (announcement_id, user_email)
);
alter table public.announcement_reads enable row level security;
