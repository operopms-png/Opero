-- Property Management tables/columns the app already uses but that were never
-- created in the live database (tenant Messages, Renewal, Profile, Tenant Checks).
-- Mirrors the Estate Agency equivalents so the two modules can sync.

create table if not exists pm_tenant_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references pm_tenants(id) on delete cascade,
  sender text not null,
  message text not null default '',
  attachment_url text,
  created_at timestamptz not null default now()
);
alter table pm_tenant_messages enable row level security;
drop policy if exists "pm tenant messages staff" on pm_tenant_messages;
create policy "pm tenant messages staff" on pm_tenant_messages for all
  using (tenant_id in (select id from pm_tenants t where t.user_id = auth.uid() or t.user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))))
  with check (tenant_id in (select id from pm_tenants t where t.user_id = auth.uid() or t.user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))));
drop policy if exists "pm tenant reads own messages" on pm_tenant_messages;
create policy "pm tenant reads own messages" on pm_tenant_messages for select
  using (tenant_id in (select id from pm_tenants where portal_user_id = auth.uid()));
drop policy if exists "pm tenant sends own messages" on pm_tenant_messages;
create policy "pm tenant sends own messages" on pm_tenant_messages for insert
  with check (sender = 'tenant' and tenant_id in (select id from pm_tenants where portal_user_id = auth.uid()));
create index if not exists pm_tenant_messages_tenant_idx on pm_tenant_messages(tenant_id);

-- Renewal / move-out on leases
alter table pm_leases add column if not exists renewal_status text default 'none';
alter table pm_leases add column if not exists renewal_notes text;
alter table pm_leases add column if not exists renewal_requested_at timestamptz;
drop policy if exists "tenants_update_own_lease_renewal" on pm_leases;
create policy "tenants_update_own_lease_renewal" on pm_leases for update
  using (tenant_id in (select id from pm_tenants where portal_user_id = auth.uid()))
  with check (tenant_id in (select id from pm_tenants where portal_user_id = auth.uid()));

-- Amenities on properties
alter table pm_properties add column if not exists wifi_ssid text;
alter table pm_properties add column if not exists wifi_password text;
alter table pm_properties add column if not exists bin_collection_notes text;
alter table pm_properties add column if not exists parking_notes text;
alter table pm_properties add column if not exists house_rules_url text;

-- Tenant profile
alter table pm_tenants add column if not exists emergency_contact_name text;
alter table pm_tenants add column if not exists emergency_contact_phone text;
alter table pm_tenants add column if not exists notify_email boolean default true;
alter table pm_tenants add column if not exists notify_sms boolean default false;
alter table pm_tenants add column if not exists dob date;
drop policy if exists "tenants_update_own_profile" on pm_tenants;
create policy "tenants_update_own_profile" on pm_tenants for update
  using (auth.uid() = portal_user_id) with check (auth.uid() = portal_user_id);

-- Tenant checks (Right to Rent + bank statements), keyed to the lease
create table if not exists pm_right_to_rent_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  lease_id uuid not null references pm_leases(id) on delete cascade,
  full_name text, date_of_birth date, current_address text,
  check_type text not null default 'Online', document_type text, share_code text, ni_number text,
  status text not null default 'Unlimited', check_date date, checked_by text, recheck_date date,
  document_url text, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists pm_rtr_checks_lease_idx on pm_right_to_rent_checks(lease_id);
create table if not exists pm_bank_statement_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  lease_id uuid not null references pm_leases(id) on delete cascade,
  statement_start date, statement_end date, declared_income numeric,
  income_regular boolean not null default false, no_overdraft boolean not null default false,
  no_bounced_payments boolean not null default false, no_gambling_flags boolean not null default false,
  status text not null default 'Passed', document_url text, notes text, checked_by text, check_date date,
  ai_assessment text, ai_assessment_generated_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists pm_bank_checks_lease_idx on pm_bank_statement_checks(lease_id);
alter table pm_right_to_rent_checks enable row level security;
alter table pm_bank_statement_checks enable row level security;
drop policy if exists "pm rtr checks business" on pm_right_to_rent_checks;
create policy "pm rtr checks business" on pm_right_to_rent_checks for all
  using ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))))
  with check ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))));
drop policy if exists "pm bank checks business" on pm_bank_statement_checks;
create policy "pm bank checks business" on pm_bank_statement_checks for all
  using ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))))
  with check ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))));

notify pgrst, 'reload schema';
