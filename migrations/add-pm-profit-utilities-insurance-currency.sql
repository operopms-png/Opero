-- Property Management: utilities and council tax, insurance policies, currency and exchange rates.
-- Run once in the Supabase SQL Editor. Safe to re-run.

-- Currency per property (GBP or JMD). Existing properties default to GBP.
alter table pm_properties add column if not exists currency text not null default 'GBP';

-- Exchange rates: how many GBP one unit of each currency is worth, used for totals.
create table if not exists pm_fx_rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  currency text not null,
  rate_to_gbp numeric not null,
  updated_at timestamptz not null default now(),
  unique (user_id, currency)
);
alter table pm_fx_rates enable row level security;
drop policy if exists pm_fx_rates_owner_only on pm_fx_rates;
create policy pm_fx_rates_owner_only on pm_fx_rates for all
  using ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))))
  with check ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))));

-- Utilities and council tax: one row per bill account on a property.
-- Do not store account passwords or payment details here.
create table if not exists pm_utilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  property_id uuid references pm_properties(id) on delete cascade,
  service text not null,
  account_holder text,
  supplier text,
  account_reference text,
  monthly_amount numeric,
  next_bill_date date,
  notes text,
  created_at timestamptz not null default now()
);
alter table pm_utilities enable row level security;
drop policy if exists pm_utilities_owner_only on pm_utilities;
create policy pm_utilities_owner_only on pm_utilities for all
  using ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))))
  with check ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))));

-- Insurance policies: the policy itself, with its renewal date.
create table if not exists pm_insurance_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  property_id uuid references pm_properties(id) on delete cascade,
  policy_type text not null,
  insurer text,
  policy_number text,
  premium numeric,
  renewal_date date,
  notes text,
  created_at timestamptz not null default now()
);
alter table pm_insurance_policies enable row level security;
drop policy if exists pm_insurance_policies_owner_only on pm_insurance_policies;
create policy pm_insurance_policies_owner_only on pm_insurance_policies for all
  using ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))))
  with check ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))));
