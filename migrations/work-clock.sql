-- Work Hours: clock in / clock out, shift start times and late arrivals. Read and written only through /api/work-clock
-- with the service role, so RLS stays on with no public policy. Safe to run twice.
create table if not exists public.work_shifts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  email text not null,
  name text,
  shift_start text not null default '09:00',
  grace_minutes int not null default 5,
  days int[] not null default '{1,2,3,4,5}',
  tz text not null default 'Europe/London',
  created_at timestamptz not null default now(),
  unique (business_id, email)
);
create table if not exists public.work_clock (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  user_id uuid not null,
  email text not null,
  name text,
  clock_in timestamptz not null default now(),
  clock_out timestamptz,
  shift_start text,
  late_minutes int not null default 0,
  note text
);
create index if not exists work_clock_biz_in on public.work_clock (business_id, clock_in desc);
create index if not exists work_clock_user_open on public.work_clock (user_id, clock_in desc);
alter table public.work_shifts enable row level security;
alter table public.work_clock enable row level security;
