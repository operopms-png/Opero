-- Per-business AI house style: tone, country/legal rules and sign-off used by every AI agent
-- when it writes a draft. Read and written only through /api/ai-client-settings (service role).
create table if not exists ai_client_settings (
  user_id uuid primary key,
  tone text,
  country_rules text,
  signoff text,
  updated_at timestamptz not null default now()
);
alter table ai_client_settings enable row level security;
-- No policies on purpose: browser sessions cannot read or write this table directly.
notify pgrst, 'reload schema';
