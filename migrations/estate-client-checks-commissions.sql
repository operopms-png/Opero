-- Estate Agency sales side, stage 4: client checks (AML, proof of funds, ID) and commissions.
create table if not exists estate_client_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  contact_id uuid references estate_contacts(id) on delete set null,
  kind text not null check (kind in ('AML','Proof of funds','ID')),
  status text not null default 'Pending',
  checked_date date,
  expiry_date date,
  source_of_funds text,
  amount_verified numeric,
  reference text,
  notes text,
  created_at timestamptz not null default now()
);
create table if not exists estate_commissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null check (kind in ('Sales commission','Lettings fee','Agency fee','Staff commission')),
  property_id uuid references estate_properties(id) on delete set null,
  sale_id uuid references estate_sales(id) on delete set null,
  agent_name text,
  base_amount numeric,
  rate numeric,
  amount numeric not null,
  status text not null default 'Due',
  due_date date,
  paid_date date,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists estate_client_checks_user on estate_client_checks(user_id, created_at desc);
create index if not exists estate_commissions_user on estate_commissions(user_id, created_at desc);
alter table estate_client_checks enable row level security;
alter table estate_commissions enable row level security;
create policy estate_client_checks_all on estate_client_checks for all
  using (auth.uid() = user_id or user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email')))
  with check (auth.uid() = user_id or user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email')));
create policy estate_commissions_all on estate_commissions for all
  using (auth.uid() = user_id or user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email')))
  with check (auth.uid() = user_id or user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email')));
create policy view_only_ins on estate_client_checks as restrictive for insert with check (not is_view_only());
create policy view_only_upd on estate_client_checks as restrictive for update using (not is_view_only());
create policy view_only_del on estate_client_checks as restrictive for delete using (not is_view_only());
create policy view_only_ins on estate_commissions as restrictive for insert with check (not is_view_only());
create policy view_only_upd on estate_commissions as restrictive for update using (not is_view_only());
create policy view_only_del on estate_commissions as restrictive for delete using (not is_view_only());
