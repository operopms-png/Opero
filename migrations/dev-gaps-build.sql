-- Developments gaps: pipeline, land, planning, design, construction, tenders, funding, risk, procurement, team, handover, build-to-rent
create table if not exists dev_pipeline (id uuid primary key default gen_random_uuid(), user_id uuid not null, created_at timestamptz default now(),
  name text not null, kind text, stage text default 'Lead', location text, asking_price numeric, est_gdv numeric, est_build_cost numeric, source text, decision_date date, notes text);
create table if not exists dev_land (id uuid primary key default gen_random_uuid(), user_id uuid not null, created_at timestamptz default now(),
  project_id uuid references dev_projects(id) on delete set null, site_name text not null, location text, ownership text, acquisition_status text default 'Identified',
  purchase_price numeric, valuation numeric, valuation_date date, survey_status text, survey_date date, planning_restrictions text, title_ref text, notes text);
create table if not exists dev_planning (id uuid primary key default gen_random_uuid(), user_id uuid not null, created_at timestamptz default now(),
  project_id uuid references dev_projects(id) on delete cascade, kind text default 'Planning application', reference text, authority text, consultant text,
  submitted_date date, decision_date date, status text default 'Preparing', conditions text, notes text);
create table if not exists dev_designs (id uuid primary key default gen_random_uuid(), user_id uuid not null, created_at timestamptz default now(),
  project_id uuid references dev_projects(id) on delete cascade, item text not null, discipline text, revision text, designer text, status text default 'Draft',
  issued_date date, approved_date date, file_url text, notes text);
create table if not exists dev_work_packages (id uuid primary key default gen_random_uuid(), user_id uuid not null, created_at timestamptz default now(),
  project_id uuid references dev_projects(id) on delete cascade, name text not null, contractor text, start_date date, end_date date, percent_complete numeric default 0,
  status text default 'Not started', inspection_date date, inspection_result text, notes text);
create table if not exists dev_tenders (id uuid primary key default gen_random_uuid(), user_id uuid not null, created_at timestamptz default now(),
  project_id uuid references dev_projects(id) on delete cascade, title text not null, supplier text, kind text default 'Tender', amount numeric,
  issued_date date, due_date date, status text default 'Open', agreement_end date, performance_score numeric, notes text);
create table if not exists dev_funding (id uuid primary key default gen_random_uuid(), user_id uuid not null, created_at timestamptz default now(),
  project_id uuid references dev_projects(id) on delete cascade, kind text default 'Loan', source text, amount numeric, drawn numeric default 0, rate numeric,
  start_date date, end_date date, status text default 'Proposed', notes text);
create table if not exists dev_risks (id uuid primary key default gen_random_uuid(), user_id uuid not null, created_at timestamptz default now(),
  project_id uuid references dev_projects(id) on delete cascade, kind text default 'Risk', risk text not null, category text, likelihood text default 'Medium', impact text default 'Medium',
  owner text, mitigation text, status text default 'Open', review_date date);
create table if not exists dev_procurement (id uuid primary key default gen_random_uuid(), user_id uuid not null, created_at timestamptz default now(),
  project_id uuid references dev_projects(id) on delete cascade, material text not null, supplier text, quantity numeric, unit_cost numeric, po_number text,
  status text default 'Requested', approval text default 'Pending', order_date date, delivery_date date, notes text);
create table if not exists dev_team (id uuid primary key default gen_random_uuid(), user_id uuid not null, created_at timestamptz default now(),
  project_id uuid references dev_projects(id) on delete cascade, person_name text not null, role text, company text, email text, phone text,
  start_date date, end_date date, allocation_pct numeric, rating numeric, notes text);
create table if not exists dev_handover (id uuid primary key default gen_random_uuid(), user_id uuid not null, created_at timestamptz default now(),
  project_id uuid references dev_projects(id) on delete cascade, unit text, kind text default 'Handover', status text default 'Pending', due_date date, done_date date, document_url text, notes text);
create table if not exists dev_btr (id uuid primary key default gen_random_uuid(), user_id uuid not null, created_at timestamptz default now(),
  project_id uuid references dev_projects(id) on delete cascade, unit_id uuid references dev_units(id) on delete set null, unit_label text, rental_ready boolean default false,
  target_rent numeric, operating_cost_monthly numeric, handed_to_pm boolean default false, pm_property_id uuid, notes text);

do $$ declare t text; begin
  foreach t in array array['dev_pipeline','dev_land','dev_planning','dev_designs','dev_work_packages','dev_tenders','dev_funding','dev_risks','dev_procurement','dev_team','dev_handover','dev_btr'] loop
    execute format('alter table %I enable row level security', t);
    execute format($p$create policy "%1$s_all" on %1$I for all using (auth.uid() = user_id or user_id in (select tm.user_id from team_members tm where tm.email = auth.jwt()->>'email')) with check (auth.uid() = user_id or user_id in (select tm.user_id from team_members tm where tm.email = auth.jwt()->>'email'))$p$, t);
    execute format($p$create policy "%1$s_view_only_ins" on %1$I as restrictive for insert with check (not is_view_only())$p$, t);
    execute format($p$create policy "%1$s_view_only_upd" on %1$I as restrictive for update using (not is_view_only())$p$, t);
    execute format($p$create policy "%1$s_view_only_del" on %1$I as restrictive for delete using (not is_view_only())$p$, t);
  end loop;
end $$;
