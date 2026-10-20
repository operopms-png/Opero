-- Property Management inventories: check-in, check-out and mid-term reports per property.
-- Separate from pm_inspections (routine and move-in/out inspections).
create table if not exists pm_inventories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  property_id uuid references pm_properties(id) on delete cascade,
  lease_id uuid references pm_leases(id) on delete set null,
  type text not null default 'Check-in',          -- Check-in | Check-out | Mid-term Inspection
  inspection_date date,
  status text not null default 'Draft',           -- Draft | Completed
  condition_summary text,
  document_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table pm_inventories enable row level security;

drop policy if exists pm_inventories_owner_only on pm_inventories;
create policy pm_inventories_owner_only on pm_inventories for all
  using ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))))
  with check ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))));
