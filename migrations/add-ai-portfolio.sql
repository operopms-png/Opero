-- Estimated market values for the Portfolio page (AI Command Centre -> Portfolio).
-- Written by the AI valuation job (web search of comparable sales), read through /api/ai-portfolio.
create table if not exists ai_property_values (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  module text not null default 'pm',
  property_id uuid not null,
  low numeric,
  typical numeric,
  high numeric,
  currency text,
  basis text,
  confidence text,
  sources jsonb,
  checked_at timestamptz not null default now(),
  unique (user_id, module, property_id)
);
alter table ai_property_values enable row level security;
-- No browser policies on purpose: read and written only by the server.
notify pgrst, 'reload schema';
