-- Real Estate Intelligence → Vacation Rentals → Dynamic Dossier.
-- Each company keeps its own pricing rules per short-stay property. Read and written only through /api/dossier
-- with the service role, so RLS stays on with no public policy. Safe to run twice.
create table if not exists public.dossier_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  property_id uuid not null,
  enabled boolean not null default false,
  base_price numeric,
  floor_price numeric,
  ceiling_price numeric,
  weekend_pct numeric not null default 15,
  last_minute_pct numeric not null default 10,
  gap_pct numeric not null default 10,
  demand_pct numeric not null default 10,
  updated_by text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (business_id, property_id)
);
create index if not exists dossier_settings_business_idx on public.dossier_settings (business_id);
alter table public.dossier_settings enable row level security;
