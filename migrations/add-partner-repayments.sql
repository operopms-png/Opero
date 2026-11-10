-- Monthly repayments back to a funding partner (owner_profiles). Server-only: read and written through /api/partner-repayments.
alter table owner_profiles add column if not exists currency text default 'JMD';
create table if not exists partner_repayments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  owner_id uuid not null references owner_profiles(id) on delete cascade,
  due_on date not null,
  amount numeric not null check (amount >= 0),
  paid_on date,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists partner_repayments_owner_idx on partner_repayments (owner_id, due_on);
alter table partner_repayments enable row level security;

-- Long-term (property management) properties linked to a partner, shown in their Long term dashboard.
alter table owner_profiles add column if not exists pm_property_ids uuid[] default '{}';

-- Landlord onboarding: named manager, agreement terms and sign-off.
alter table pm_landlords add column if not exists manager_id uuid;
alter table pm_landlords add column if not exists agreement_type text;
alter table pm_landlords add column if not exists agreement_start date;
alter table pm_landlords add column if not exists agreement_end date;
alter table pm_landlords add column if not exists agreement_terms text;
alter table pm_landlords add column if not exists onboarded_at timestamptz;
