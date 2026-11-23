-- Building notices: a notice from staff (e.g. gate or lift works) shown in the Maintenance tab of the tenants, landlords and
-- partners of the chosen homes, and emailed to them. property_ids are pm_properties ids. Read/written through /api only.
create table if not exists public.building_notices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  title text not null,
  body text not null,
  building_name text,
  property_ids uuid[] not null default '{}',
  for_tenants boolean not null default true,
  for_landlords boolean not null default true,
  for_partners boolean not null default true,
  archived boolean not null default false,
  created_by_name text,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists building_notices_biz_idx on public.building_notices (business_id, archived, created_at desc);
alter table public.building_notices enable row level security;
