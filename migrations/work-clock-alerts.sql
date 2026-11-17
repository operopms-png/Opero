-- One row per missed-clock-in email already sent, so each person is only reported once per day. Service role only.
create table if not exists public.work_clock_alerts (
  business_id uuid not null,
  email text not null,
  day date not null,
  sent_at timestamptz not null default now(),
  primary key (business_id, email, day)
);
alter table public.work_clock_alerts enable row level security;
