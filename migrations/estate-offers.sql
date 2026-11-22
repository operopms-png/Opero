-- Estate Agency sales side, stage 2: offers and negotiations.
create table if not exists estate_offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  property_id uuid references estate_properties(id) on delete set null,
  contact_id uuid references estate_contacts(id) on delete set null,
  direction text not null default 'received' check (direction in ('received','submitted')),
  amount numeric not null,
  counter_amount numeric,
  status text not null default 'Received',
  approval text not null default 'Not needed' check (approval in ('Not needed','Pending','Approved')),
  conditions text,
  offer_date date not null default current_date,
  valid_until date,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists estate_offers_user on estate_offers(user_id, created_at desc);
alter table estate_offers enable row level security;
create policy estate_offers_all on estate_offers for all
  using (auth.uid() = user_id or user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email')))
  with check (auth.uid() = user_id or user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email')));
create policy view_only_ins on estate_offers as restrictive for insert with check (not is_view_only());
create policy view_only_upd on estate_offers as restrictive for update using (not is_view_only());
create policy view_only_del on estate_offers as restrictive for delete using (not is_view_only());
