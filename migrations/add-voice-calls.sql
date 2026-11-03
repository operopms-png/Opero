-- Voice call log: each Novourq Voice phone-style call with its transcript. Service role only.
create table if not exists voice_calls (
  id uuid primary key,
  business_id uuid not null,
  user_email text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz not null default now(),
  seconds int not null default 0,
  tasks int not null default 0,
  turns jsonb not null default '[]'::jsonb
);
create index if not exists voice_calls_user on voice_calls (user_email, started_at desc);
alter table voice_calls enable row level security;
