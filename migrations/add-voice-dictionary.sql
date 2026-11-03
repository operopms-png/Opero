-- Voice layer: a shared dictionary per business (spellings and shortcuts) and a usage log
-- (rate limit + "words dictated" counter). Service role only: no policies, RLS on.
create table if not exists voice_dictionary (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  term text not null,
  replacement text,
  created_by text,
  created_at timestamptz not null default now()
);
create unique index if not exists voice_dictionary_term on voice_dictionary (business_id, lower(term));
alter table voice_dictionary enable row level security;

create table if not exists voice_usage (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  user_email text not null,
  kind text not null default 'dictate',
  words int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists voice_usage_user on voice_usage (user_email, created_at desc);
alter table voice_usage enable row level security;
