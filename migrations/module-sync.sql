-- Keep Property Management and Estate Agency in step: a link table plus triggers that copy shared details
-- between the two copies of the same owner, tenant, property, building or unit.
-- Only plain shared fields are copied (names, contact and bank details, address, photos and so on).
-- Status, rent, links to other records and portal logins are never copied, because they differ by module.
create table if not exists module_links (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('landlord','tenant','property','building','unit')),
  user_id uuid not null,
  pm_id uuid not null,
  ea_id uuid not null,
  created_at timestamptz not null default now(),
  unique (kind, pm_id), unique (kind, ea_id)
);
alter table module_links enable row level security;

-- 1. Copy shared columns to the linked twin when one side changes.
create or replace function sync_linked() returns trigger language plpgsql security definer set search_path = public as $$
declare kind text := tg_argv[0]; side text := tg_argv[1]; twin text := tg_argv[2]; cols text[] := string_to_array(tg_argv[3], ',');
        other uuid; payload jsonb;
begin
  if pg_trigger_depth() > 1 then return new; end if;
  select case when side = 'pm' then ea_id else pm_id end into other from module_links
   where module_links.kind = sync_linked.kind and ((side = 'pm' and pm_id = new.id) or (side = 'ea' and ea_id = new.id));
  if other is null then return new; end if;
  select jsonb_object_agg(k, v) into payload from jsonb_each(to_jsonb(new)) as e(k, v) where k = any(cols);
  execute format('update %I set (%s) = (select %s from jsonb_populate_record(null::%I, $1)) where id = $2', twin, array_to_string(cols, ','), array_to_string(cols, ','), twin) using payload, other;
  return new;
end $$;

-- 2. Link a new record to its twin when the same person or place already exists in the other module.
create or replace function autolink_new() returns trigger language plpgsql security definer set search_path = public as $$
declare kind text := tg_argv[0]; side text := tg_argv[1]; twin text := tg_argv[2]; matchcol text := tg_argv[3]; found uuid; val text;
begin
  val := lower(btrim(coalesce(to_jsonb(new)->>matchcol, '')));
  if val = '' then return new; end if;
  execute format('select t.id from %I t where t.user_id = $1 and lower(btrim(coalesce(t.%I::text, ''''))) = $2 and not exists (select 1 from module_links l where l.kind = $3 and (l.pm_id = t.id or l.ea_id = t.id)) limit 1', twin, matchcol) into found using new.user_id, val, kind;
  if found is not null then
    insert into module_links (kind, user_id, pm_id, ea_id) values (kind, new.user_id, case when side = 'pm' then new.id else found end, case when side = 'pm' then found else new.id end) on conflict do nothing;
  end if;
  return new;
end $$;

-- 3. Backfill links between records that are already in both modules.
insert into module_links (kind, user_id, pm_id, ea_id)
select 'landlord', p.user_id, p.id, e.id from pm_landlords p join estate_landlords e on e.user_id = p.user_id and lower(btrim(e.email)) = lower(btrim(p.email)) and btrim(coalesce(p.email,'')) <> '' on conflict do nothing;
insert into module_links (kind, user_id, pm_id, ea_id)
select 'tenant', p.user_id, p.id, e.id from pm_tenants p join estate_tenants e on e.user_id = p.user_id and lower(btrim(e.email)) = lower(btrim(p.email)) and btrim(coalesce(p.email,'')) <> '' on conflict do nothing;
insert into module_links (kind, user_id, pm_id, ea_id)
select 'property', p.user_id, p.id, e.id from pm_properties p join estate_properties e on e.user_id = p.user_id and lower(btrim(e.name)) = lower(btrim(p.name)) on conflict do nothing;
insert into module_links (kind, user_id, pm_id, ea_id)
select 'building', p.user_id, p.id, e.id from pm_buildings p join estate_buildings e on e.user_id = p.user_id and lower(btrim(e.name)) = lower(btrim(p.name)) on conflict do nothing;
insert into module_links (kind, user_id, pm_id, ea_id)
select 'unit', p.user_id, p.id, e.id from pm_units p
  join module_links lp on lp.kind = 'property' and lp.pm_id = p.property_id
  join estate_units e on e.property_id = lp.ea_id and lower(btrim(e.unit_number)) = lower(btrim(p.unit_number)) on conflict do nothing;

-- 4. Triggers.
do $$
declare d record;
begin
  for d in select * from (values
    ('landlord','landlords','name,email,phone,address,id_type,id_url,bank_name,account_name,account_number,sort_code,iban,swift,notes','email'),
    ('tenant','tenants','name,email,phone,dob,id_type,id_url,emergency_contact_name,emergency_contact_phone,notify_email,notify_sms','email'),
    ('property','properties','name,address,country,bedrooms,bathrooms,image_urls,currency,lat,lng,geocoded_at,ended_at,ended_reason,ended_note','name'),
    ('building','buildings','name,address,notes,total_units','name'),
    ('unit','units','unit_number,plan_url,layout',null)
  ) as v(kind, base, cols, matchcol) loop
    execute format('drop trigger if exists sync_pm on pm_%s', d.base);
    execute format('drop trigger if exists sync_ea on estate_%s', d.base);
    execute format('create trigger sync_pm after update of %s on pm_%s for each row execute function sync_linked(%L,%L,%L,%L)', d.cols, d.base, d.kind, 'pm', 'estate_' || d.base, d.cols);
    execute format('create trigger sync_ea after update of %s on estate_%s for each row execute function sync_linked(%L,%L,%L,%L)', d.cols, d.base, d.kind, 'ea', 'pm_' || d.base, d.cols);
    if d.matchcol is not null then
      execute format('drop trigger if exists autolink_pm on pm_%s', d.base);
      execute format('drop trigger if exists autolink_ea on estate_%s', d.base);
      execute format('create trigger autolink_pm after insert on pm_%s for each row execute function autolink_new(%L,%L,%L,%L)', d.base, d.kind, 'pm', 'estate_' || d.base, d.matchcol);
      execute format('create trigger autolink_ea after insert on estate_%s for each row execute function autolink_new(%L,%L,%L,%L)', d.base, d.kind, 'ea', 'pm_' || d.base, d.matchcol);
    end if;
  end loop;
end $$;
