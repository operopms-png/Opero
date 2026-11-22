-- Stage 1 of the Estate Agency sales side: a for-sale setting on properties, and
-- buyers / sellers / applicants in one table.
alter table estate_properties add column if not exists for_sale boolean not null default false;
alter table estate_properties add column if not exists sale_price numeric;

create table if not exists estate_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null check (kind in ('buyer','seller','applicant')),
  name text not null,
  email text,
  phone text,
  budget_min numeric,
  budget_max numeric,
  property_id uuid references estate_properties(id) on delete set null,
  source text,
  status text not null default 'New',
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists estate_contacts_user_kind on estate_contacts(user_id, kind);
alter table estate_contacts enable row level security;
drop policy if exists estate_contacts_all on estate_contacts;
create policy estate_contacts_all on estate_contacts for all
  using (auth.uid() = user_id or user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email')))
  with check (auth.uid() = user_id or user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email')));
drop policy if exists view_only_ins on estate_contacts;
drop policy if exists view_only_upd on estate_contacts;
drop policy if exists view_only_del on estate_contacts;
create policy view_only_ins on estate_contacts as restrictive for insert with check (not is_view_only());
create policy view_only_upd on estate_contacts as restrictive for update using (not is_view_only());
create policy view_only_del on estate_contacts as restrictive for delete using (not is_view_only());
