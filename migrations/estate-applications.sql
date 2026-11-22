-- Estate Agency: rental applications with a referencing checklist.
create table if not exists estate_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  contact_id uuid references estate_contacts(id) on delete set null,
  property_id uuid references estate_properties(id) on delete set null,
  stage text not null default 'Applied',
  monthly_rent numeric,
  holding_deposit numeric,
  holding_deposit_paid boolean not null default false,
  move_in_date date,
  employer_ref text not null default 'Not started',
  landlord_ref text not null default 'Not started',
  credit_check text not null default 'Not started',
  affordability text not null default 'Not started',
  guarantor text not null default 'Not needed',
  right_to_rent text not null default 'Not started',
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists estate_applications_user on estate_applications(user_id, created_at desc);
alter table estate_applications enable row level security;
create policy estate_applications_all on estate_applications for all
  using (auth.uid() = user_id or user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email')))
  with check (auth.uid() = user_id or user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email')));
create policy view_only_ins on estate_applications as restrictive for insert with check (not is_view_only());
create policy view_only_upd on estate_applications as restrictive for update using (not is_view_only());
create policy view_only_del on estate_applications as restrictive for delete using (not is_view_only());
