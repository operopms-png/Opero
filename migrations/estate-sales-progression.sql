-- Estate Agency sales side, stage 3: sales progression (a sale per accepted offer, with a checklist of steps).
create table if not exists estate_sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  property_id uuid references estate_properties(id) on delete set null,
  offer_id uuid references estate_offers(id) on delete set null,
  buyer_id uuid references estate_contacts(id) on delete set null,
  seller_id uuid references estate_contacts(id) on delete set null,
  agreed_price numeric,
  status text not null default 'Sale agreed',
  buyer_solicitor text,
  seller_solicitor text,
  target_completion date,
  completed_date date,
  notes text,
  created_at timestamptz not null default now()
);
create table if not exists estate_sale_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  sale_id uuid not null references estate_sales(id) on delete cascade,
  category text not null,
  name text not null,
  sort int not null default 0,
  done boolean not null default false,
  done_date date,
  due_date date,
  notes text
);
create index if not exists estate_sales_user on estate_sales(user_id, created_at desc);
create index if not exists estate_sale_steps_sale on estate_sale_steps(sale_id, sort);
alter table estate_sales enable row level security;
alter table estate_sale_steps enable row level security;
create policy estate_sales_all on estate_sales for all
  using (auth.uid() = user_id or user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email')))
  with check (auth.uid() = user_id or user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email')));
create policy estate_sale_steps_all on estate_sale_steps for all
  using (auth.uid() = user_id or user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email')))
  with check (auth.uid() = user_id or user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email')));
create policy view_only_ins on estate_sales as restrictive for insert with check (not is_view_only());
create policy view_only_upd on estate_sales as restrictive for update using (not is_view_only());
create policy view_only_del on estate_sales as restrictive for delete using (not is_view_only());
create policy view_only_ins on estate_sale_steps as restrictive for insert with check (not is_view_only());
create policy view_only_upd on estate_sale_steps as restrictive for update using (not is_view_only());
create policy view_only_del on estate_sale_steps as restrictive for delete using (not is_view_only());
