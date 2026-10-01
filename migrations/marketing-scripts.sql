-- Marketing → Scripts: wording staff insert in Email / Airbnb Inbox and the AI follows.
create table if not exists public.marketing_scripts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  name text not null,
  category text not null default 'General',
  stage text,                                  -- e.g. "Step 1 · First message to a host"
  kind text not null default 'message',        -- message | guide (staff instructions, never sent)
  body text not null default '',
  note text,                                   -- tip for staff, not sent
  show_email boolean not null default true,
  show_airbnb boolean not null default true,
  ai_use boolean not null default false,
  sort integer not null default 0,
  use_count integer not null default 0,
  created_by text,
  updated_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.marketing_scripts enable row level security;
create index if not exists marketing_scripts_biz_idx on public.marketing_scripts (business_id, category);
