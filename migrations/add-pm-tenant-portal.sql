-- Links a pm_tenants row to a real Supabase auth user, so a tenant can log
-- in and see their own lease/payments/maintenance at /pm-tenant-portal.
-- Same pattern as pm_landlords.portal_user_id for the landlord portal.
alter table pm_tenants
  add column if not exists portal_user_id uuid references auth.users(id) on delete set null;

create index if not exists pm_tenants_portal_user_id_idx on pm_tenants(portal_user_id);

-- A tenant can see their own profile row.
drop policy if exists "tenants_see_own_profile" on pm_tenants;
create policy "tenants_see_own_profile" on pm_tenants
  for select using (auth.uid() = portal_user_id);

-- A tenant can see their own lease(s).
drop policy if exists "tenants_see_own_leases" on pm_leases;
create policy "tenants_see_own_leases" on pm_leases
  for select using (tenant_id in (select id from pm_tenants where portal_user_id = auth.uid()));

-- A tenant can see their own rent payment history.
drop policy if exists "tenants_see_own_payments" on pm_rent_payments;
create policy "tenants_see_own_payments" on pm_rent_payments
  for select using (tenant_id in (select id from pm_tenants where portal_user_id = auth.uid()));

-- A tenant can see the property/unit they live in (read-only — name,
-- address, etc. — not anything else in the property manager's account).
drop policy if exists "tenants_see_own_property" on pm_properties;
create policy "tenants_see_own_property" on pm_properties
  for select using (id in (select property_id from pm_tenants where portal_user_id = auth.uid()));

drop policy if exists "tenants_see_own_unit" on pm_units;
create policy "tenants_see_own_unit" on pm_units
  for select using (id in (select unit_id from pm_tenants where portal_user_id = auth.uid()));

-- A tenant can submit a maintenance request for their own property. The
-- WITH CHECK ensures they can't fabricate a ticket for a property they
-- don't live in, and that user_id always matches the actual property
-- owner (the PM business), keeping it consistent with staff-side RLS
-- on pm_maintenance which is scoped by user_id.
drop policy if exists "tenants_create_maintenance" on pm_maintenance;
create policy "tenants_create_maintenance" on pm_maintenance
  for insert
  with check (
    property_id in (select property_id from pm_tenants where portal_user_id = auth.uid())
    and user_id = (select user_id from pm_properties where id = property_id)
  );

notify pgrst, 'reload schema';
