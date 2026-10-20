-- Property Management: company on tenants, tour link on properties, furniture list per unit.
alter table pm_tenants add column if not exists company text;
alter table pm_properties add column if not exists tour_url text;

create table if not exists pm_furniture (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  property_id uuid references pm_properties(id) on delete cascade,
  unit_id uuid references pm_units(id) on delete cascade,
  item text not null,
  quantity integer not null default 1,
  condition text,
  notes text,
  created_at timestamptz not null default now()
);
alter table pm_furniture enable row level security;
drop policy if exists pm_furniture_owner_only on pm_furniture;
create policy pm_furniture_owner_only on pm_furniture for all
  using ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))))
  with check ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))));
