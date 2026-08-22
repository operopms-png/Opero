-- Adds seven tenant-portal features: Documents, Messages, Announcements
-- (reuses existing system_messages), Renewal/Move-out, Community/Amenities,
-- Payment history (already covered by pm_rent_payments), and Profile settings.

-- ============ MESSAGES ============
-- Mirrors pm_landlord_messages exactly.
create table if not exists pm_tenant_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references pm_tenants(id) on delete cascade,
  sender text not null check (sender in ('staff','tenant')),
  message text not null default '',
  attachment_url text,
  created_at timestamptz not null default now()
);

alter table pm_tenant_messages enable row level security;

drop policy if exists "tenant or owning staff can read messages" on pm_tenant_messages;
create policy "tenant or owning staff can read messages"
on pm_tenant_messages
for select
using (
  tenant_id in (select id from pm_tenants where portal_user_id = auth.uid())
  or
  tenant_id in (
    select t.id from pm_tenants t
    join pm_properties p on p.id = t.property_id
    where p.user_id = auth.uid()
  )
);

drop policy if exists "tenant can send own messages" on pm_tenant_messages;
create policy "tenant can send own messages"
on pm_tenant_messages
for insert
with check (
  sender = 'tenant'
  and tenant_id in (select id from pm_tenants where portal_user_id = auth.uid())
);

-- Staff sends go through the service-role API route (send-tenant-message).

-- ============ DOCUMENTS ============
-- Mirrors estate_documents. Staff uploads via admin; tenant reads their own.
create table if not exists pm_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  property_id uuid references pm_properties(id) on delete set null,
  tenant_id uuid references pm_tenants(id) on delete set null,
  name text not null,
  category text default 'Other',
  file_url text,
  expiry_date date,
  notes text,
  created_at timestamptz not null default now()
);

alter table pm_documents enable row level security;

drop policy if exists "pm_documents_owner_only" on pm_documents;
create policy "pm_documents_owner_only" on pm_documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tenants_see_own_documents" on pm_documents;
create policy "tenants_see_own_documents" on pm_documents
  for select using (tenant_id in (select id from pm_tenants where portal_user_id = auth.uid()));

create index if not exists idx_pm_documents_tenant on pm_documents(tenant_id);
create index if not exists idx_pm_documents_property on pm_documents(property_id);

-- ============ RENEWAL / MOVE-OUT ============
alter table pm_leases add column if not exists renewal_status text default 'none'
  check (renewal_status in ('none','renewal_requested','move_out_requested','renewed','moving_out'));
alter table pm_leases add column if not exists renewal_notes text;
alter table pm_leases add column if not exists renewal_requested_at timestamptz;

-- Tenants can update the renewal fields on their own lease only.
drop policy if exists "tenants_update_own_lease_renewal" on pm_leases;
create policy "tenants_update_own_lease_renewal" on pm_leases
  for update
  using (tenant_id in (select id from pm_tenants where portal_user_id = auth.uid()))
  with check (tenant_id in (select id from pm_tenants where portal_user_id = auth.uid()));

-- ============ COMMUNITY / AMENITIES ============
-- Staff-editable info shown read-only to tenants of that property.
alter table pm_properties add column if not exists wifi_ssid text;
alter table pm_properties add column if not exists wifi_password text;
alter table pm_properties add column if not exists bin_collection_notes text;
alter table pm_properties add column if not exists parking_notes text;
alter table pm_properties add column if not exists house_rules_url text;

-- ============ PROFILE SETTINGS ============
alter table pm_tenants add column if not exists phone text;
alter table pm_tenants add column if not exists email text;
alter table pm_tenants add column if not exists emergency_contact_name text;
alter table pm_tenants add column if not exists emergency_contact_phone text;
alter table pm_tenants add column if not exists notify_email boolean default true;
alter table pm_tenants add column if not exists notify_sms boolean default false;

-- Tenants can update their own contact/emergency/notification fields.
drop policy if exists "tenants_update_own_profile" on pm_tenants;
create policy "tenants_update_own_profile" on pm_tenants
  for update
  using (auth.uid() = portal_user_id)
  with check (auth.uid() = portal_user_id);

notify pgrst, 'reload schema';
