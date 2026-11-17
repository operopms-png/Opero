-- Deal Analyser → Jamaica real estate charges. Each company keeps its own default rates
-- (percentages and flat fees). Read and written only through /api/jamaica-costs with the service role,
-- so RLS stays on with no public policy. Safe to run twice.
create table if not exists public.jamaica_cost_rates (
  business_id uuid primary key,
  rates jsonb not null default '{}'::jsonb,
  updated_by text,
  updated_at timestamptz not null default now()
);
alter table public.jamaica_cost_rates enable row level security;
