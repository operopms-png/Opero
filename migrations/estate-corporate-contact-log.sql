-- Estate Agency: corporate clients (a fourth contact kind) and a contact history log for any person.
alter table estate_contacts drop constraint if exists estate_contacts_kind_check;
alter table estate_contacts add constraint estate_contacts_kind_check check (kind in ('buyer','seller','applicant','corporate'));
create table if not exists estate_contact_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  person_type text not null check (person_type in ('contact','landlord','tenant')),
  person_id uuid not null,
  kind text not null default 'Note' check (kind in ('Call','Email','WhatsApp','SMS','Meeting','Viewing','Note')),
  summary text not null,
  logged_at timestamptz not null default now(),
  created_by text
);
create index if not exists estate_contact_log_person on estate_contact_log(user_id, person_type, person_id, logged_at desc);
alter table estate_contact_log enable row level security;
create policy estate_contact_log_all on estate_contact_log for all
  using (auth.uid() = user_id or user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email')))
  with check (auth.uid() = user_id or user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email')));
create policy view_only_ins on estate_contact_log as restrictive for insert with check (not is_view_only());
create policy view_only_upd on estate_contact_log as restrictive for update using (not is_view_only());
create policy view_only_del on estate_contact_log as restrictive for delete using (not is_view_only());
