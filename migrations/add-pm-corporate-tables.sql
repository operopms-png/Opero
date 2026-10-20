-- Property Management: head leases, HMO room register, key register and audit log.
-- Run once in the Supabase SQL Editor. Safe to re-run.

-- Head leases: the landlord's lease on each property that we sublet from.
create table if not exists pm_head_leases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  property_id uuid references pm_properties(id) on delete cascade,
  landlord_name text,
  rent_payable numeric,
  start_date date,
  expiry_date date,
  break_date date,
  sublet_consent text,
  notes text,
  created_at timestamptz not null default now()
);
alter table pm_head_leases enable row level security;
drop policy if exists pm_head_leases_owner_only on pm_head_leases;
create policy pm_head_leases_owner_only on pm_head_leases for all
  using ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))))
  with check ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))));

-- HMO rooms: one row per room, with its own occupant limit and licence expiry.
create table if not exists pm_hmo_rooms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  property_id uuid references pm_properties(id) on delete cascade,
  room_name text not null,
  max_occupants integer not null default 1,
  licence_expiry date,
  tenant_id uuid references pm_tenants(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);
alter table pm_hmo_rooms enable row level security;
drop policy if exists pm_hmo_rooms_owner_only on pm_hmo_rooms;
create policy pm_hmo_rooms_owner_only on pm_hmo_rooms for all
  using ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))))
  with check ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))));

-- Key register: where each key set is kept and who holds it.
-- Do not store lockbox or door codes here; record only where they are kept.
create table if not exists pm_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  property_id uuid references pm_properties(id) on delete cascade,
  key_set text not null,
  held_by text,
  kept_at text,
  last_checked date,
  notes text,
  created_at timestamptz not null default now()
);
alter table pm_keys enable row level security;
drop policy if exists pm_keys_owner_only on pm_keys;
create policy pm_keys_owner_only on pm_keys for all
  using ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))))
  with check ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))));

-- Audit log: a row for every insert, update and delete on the tables below.
create table if not exists pm_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  table_name text not null,
  record_id uuid,
  action text not null,
  changed_by uuid default auth.uid(),
  changes jsonb,
  created_at timestamptz not null default now()
);
alter table pm_audit_log enable row level security;
drop policy if exists pm_audit_log_owner_read on pm_audit_log;
create policy pm_audit_log_owner_read on pm_audit_log for select
  using ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))));

create or replace function pm_audit_row() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (TG_OP = 'DELETE') then
    insert into pm_audit_log(user_id, table_name, record_id, action, changes)
    values (OLD.user_id, TG_TABLE_NAME, OLD.id, 'delete', to_jsonb(OLD));
    return OLD;
  elsif (TG_OP = 'UPDATE') then
    insert into pm_audit_log(user_id, table_name, record_id, action, changes)
    values (NEW.user_id, TG_TABLE_NAME, NEW.id, 'update', jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW)));
    return NEW;
  else
    insert into pm_audit_log(user_id, table_name, record_id, action, changes)
    values (NEW.user_id, TG_TABLE_NAME, NEW.id, 'insert', to_jsonb(NEW));
    return NEW;
  end if;
end $$;

drop trigger if exists pm_audit_properties on pm_properties;
create trigger pm_audit_properties after insert or update or delete on pm_properties
  for each row execute function pm_audit_row();

drop trigger if exists pm_audit_leases on pm_leases;
create trigger pm_audit_leases after insert or update or delete on pm_leases
  for each row execute function pm_audit_row();

drop trigger if exists pm_audit_head_leases on pm_head_leases;
create trigger pm_audit_head_leases after insert or update or delete on pm_head_leases
  for each row execute function pm_audit_row();
