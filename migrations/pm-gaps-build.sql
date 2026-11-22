-- Property Management gaps: property type, break clauses, applications, meter readings, upkeep, budgets, supplier agreements.
alter table pm_properties add column if not exists management_type text not null default 'Managed';
alter table pm_leases add column if not exists break_date date;
alter table pm_leases add column if not exists break_notice_days int;

create table if not exists pm_applications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null,
  property_id uuid references pm_properties(id) on delete set null,
  applicant_name text not null, email text, phone text,
  stage text not null default 'Applied', monthly_rent numeric, move_in_date date,
  employer_ref text not null default 'Not started', landlord_ref text not null default 'Not started',
  credit_check text not null default 'Not started', affordability text not null default 'Not started',
  right_to_rent text not null default 'Not started', notes text, created_at timestamptz not null default now());
create table if not exists pm_meter_readings (
  id uuid primary key default gen_random_uuid(), user_id uuid not null,
  property_id uuid references pm_properties(id) on delete set null,
  meter_type text not null default 'Electricity', meter_number text, reading numeric not null,
  reading_date date not null default current_date, read_by text, notes text, created_at timestamptz not null default now());
create table if not exists pm_upkeep (
  id uuid primary key default gen_random_uuid(), user_id uuid not null,
  property_id uuid references pm_properties(id) on delete set null,
  kind text not null default 'Cleaning team', title text not null, team text, frequency text,
  last_date date, next_date date, score int, status text not null default 'Active', notes text,
  created_at timestamptz not null default now());
create table if not exists pm_budgets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null,
  property_id uuid references pm_properties(id) on delete set null,
  budget_year int not null default extract(year from current_date)::int, category text not null default 'Maintenance',
  budget_amount numeric not null default 0, spent_amount numeric, notes text, created_at timestamptz not null default now());
create table if not exists pm_supplier_agreements (
  id uuid primary key default gen_random_uuid(), user_id uuid not null,
  property_id uuid references pm_properties(id) on delete set null,
  supplier_name text not null, service text, start_date date, end_date date, rate text,
  insurance_expiry date, onboarding text not null default 'Not started', status text not null default 'Active',
  notes text, created_at timestamptz not null default now());

do $$ declare t text; begin
  foreach t in array array['pm_applications','pm_meter_readings','pm_upkeep','pm_budgets','pm_supplier_agreements'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create index if not exists %I on %I(user_id, created_at desc)', t||'_user', t);
    execute format($p$create policy %I on %I for all using (auth.uid() = user_id or user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))) with check (auth.uid() = user_id or user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email')))$p$, t||'_team', t);
    execute format('create policy view_only_ins on %I as restrictive for insert with check (not is_view_only())', t);
    execute format('create policy view_only_upd on %I as restrictive for update using (not is_view_only())', t);
    execute format('create policy view_only_del on %I as restrictive for delete using (not is_view_only())', t);
  end loop;
end $$;
