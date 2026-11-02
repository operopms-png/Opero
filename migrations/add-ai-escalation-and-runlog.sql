-- Escalation rules (who is told when AI work needs a person) and a log of scheduled AI runs.
-- Both are read and written only through the API routes (service role), so there are no
-- browser policies on purpose.
create table if not exists ai_escalation_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  trigger text not null check (trigger in ('draft_waiting','failed_action','expired_certificate','arrears')),
  after_hours int not null default 24 check (after_hours between 1 and 720),
  notify_email text not null,
  notify_name text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists ai_escalation_rules_user on ai_escalation_rules (user_id);
alter table ai_escalation_rules enable row level security;

create table if not exists ai_run_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,            -- null = the scheduled run for every business
  workflow text not null,  -- 'proposals' | 'escalation'
  ok boolean not null default true,
  result jsonb,
  ran_at timestamptz not null default now()
);
create index if not exists ai_run_log_recent on ai_run_log (ran_at desc);
alter table ai_run_log enable row level security;

notify pgrst, 'reload schema';
