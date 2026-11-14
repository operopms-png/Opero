-- Sign-in / sign-out / time-on-portal record for each member of staff (Work Hours page).
create table if not exists work_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  user_id uuid not null,
  email text not null,
  name text,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  end_reason text,
  active_seconds int not null default 0,
  pages jsonb not null default '[]'::jsonb,
  user_agent text
);
create index if not exists work_sessions_biz_started on work_sessions (business_id, started_at desc);
create index if not exists work_sessions_user_open on work_sessions (user_id, last_seen_at desc);
alter table work_sessions enable row level security;
