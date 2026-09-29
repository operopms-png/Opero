-- Full two-way sync between Property Management (pm_*) and Estate Agency (estate_*).
-- Anything created, edited or deleted on one side is mirrored on the other.
--
-- How it works
--  * pm_estate_sync_pairs: one row per pair of tables + which columns match.
--    Columns with the same name are matched automatically; renames/one-way
--    transforms are listed as extras. Id columns that point at another synced
--    table (property_id, tenant_id, unit_id, …) are translated to the twin's id.
--  * pm_estate_links: which pm row is the twin of which estate row.
--    Properties and tenants keep using their existing twin columns
--    (pm_properties.estate_property_id / pm_tenants.estate_tenant_id).
--  * pe_sync(): one AFTER trigger on every table. A transaction-local flag
--    stops the mirrored write from bouncing back. If a mirror write fails it
--    is logged to pm_estate_sync_errors — the user's own save always succeeds.

create table if not exists pm_estate_links (
  pair text not null, pm_id uuid not null, ea_id uuid not null,
  primary key (pair, pm_id), unique (pair, ea_id)
);
alter table pm_estate_links enable row level security;

create table if not exists pm_estate_sync_pairs (
  pair text primary key, pm_table text not null, ea_table text not null,
  cols jsonb not null default '[]', pm_defaults jsonb not null default '{}', ea_defaults jsonb not null default '{}',
  match_cols text[]
);
alter table pm_estate_sync_pairs enable row level security;

create table if not exists pm_estate_sync_errors (
  id bigserial primary key, pair text, side text, op text, row_id uuid, error text, created_at timestamptz default now()
);
alter table pm_estate_sync_errors enable row level security;

-- twin id for a row on one side
create or replace function pe_twin(p_pair text, p_side text, p_id uuid) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare r uuid;
begin
  if p_id is null then return null; end if;
  if p_pair = 'properties' then
    if p_side = 'pm' then select estate_property_id into r from pm_properties where id = p_id;
    else select pm_property_id into r from estate_properties where id = p_id; end if;
  elsif p_pair = 'tenants' then
    if p_side = 'pm' then select estate_tenant_id into r from pm_tenants where id = p_id;
    else select pm_tenant_id into r from estate_tenants where id = p_id; end if;
  elsif p_side = 'pm' then select ea_id into r from pm_estate_links where pair = p_pair and pm_id = p_id;
  else select pm_id into r from pm_estate_links where pair = p_pair and ea_id = p_id; end if;
  return r;
end $$;

-- translate a row from one side into the other side's columns
create or replace function pe_translate(p_pair text, p_side text, p_row jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare cfg pm_estate_sync_pairs; c jsonb; v jsonb; out jsonb := '{}'; other text; s text; d text; k text;
begin
  select * into cfg from pm_estate_sync_pairs where pair = p_pair;
  other := case p_side when 'pm' then 'ea' else 'pm' end;
  for c in select * from jsonb_array_elements(cfg.cols) loop
    if c ? 'only' and c->>'only' <> p_side then continue; end if;
    s := c->>p_side; d := c->>other;
    if s is null or d is null or not (p_row ? s) then continue; end if;
    v := p_row->s;
    if c ? 'fk' and v is not null and jsonb_typeof(v) = 'string' then
      v := coalesce(to_jsonb(pe_twin(c->>'fk', p_side, (v #>> '{}')::uuid)), 'null'::jsonb);
    elsif c->>'fn' = 'day' and jsonb_typeof(v) = 'string' then
      v := to_jsonb(extract(day from (v #>> '{}')::date)::int::text);
    end if;
    out := out || jsonb_build_object(d, v);
  end loop;
  for k in select jsonb_object_keys(case other when 'pm' then cfg.pm_defaults else cfg.ea_defaults end) loop
    if not (out ? k) or out->k = 'null'::jsonb then
      out := out || jsonb_build_object(k, (case other when 'pm' then cfg.pm_defaults else cfg.ea_defaults end)->k);
    end if;
  end loop;
  return out;
end $$;

-- create the twin of a row, record the link, return the new id
create or replace function pe_create_twin(p_pair text, p_side text, p_id uuid, p_row jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare cfg pm_estate_sync_pairs; dst jsonb; tbl text; cols text; newid uuid;
begin
  select * into cfg from pm_estate_sync_pairs where pair = p_pair;
  tbl := case p_side when 'pm' then cfg.ea_table else cfg.pm_table end;
  dst := pe_translate(p_pair, p_side, p_row);
  select string_agg(quote_ident(k), ',') into cols from jsonb_object_keys(dst) k;
  if cols is null then return null; end if;
  execute format('insert into %I (%s) select %s from jsonb_populate_record(null::%I, $1) returning id', tbl, cols, cols, tbl) using dst into newid;
  if p_pair not in ('properties', 'tenants') then
    if p_side = 'pm' then insert into pm_estate_links values (p_pair, p_id, newid) on conflict do nothing;
    else insert into pm_estate_links values (p_pair, newid, p_id) on conflict do nothing; end if;
  end if;
  return newid;
end $$;

create or replace function pe_update_twin(p_pair text, p_side text, p_twin uuid, p_row jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare cfg pm_estate_sync_pairs; dst jsonb; tbl text; cols text;
begin
  select * into cfg from pm_estate_sync_pairs where pair = p_pair;
  tbl := case p_side when 'pm' then cfg.ea_table else cfg.pm_table end;
  dst := pe_translate(p_pair, p_side, p_row);
  select string_agg(quote_ident(k), ',') into cols from jsonb_object_keys(dst) k;
  if cols is null then return; end if;
  execute format('update %I set (%s) = (select %s from jsonb_populate_record(null::%I, $1)) where id = $2', tbl, cols, cols, tbl) using dst, p_twin;
end $$;

create or replace function pe_sync() returns trigger
language plpgsql security definer set search_path = public as $$
declare p_pair text := tg_argv[0]; p_side text := tg_argv[1]; cfg pm_estate_sync_pairs; twin uuid; tbl text; rid uuid;
begin
  if coalesce(current_setting('pe.sync', true), '') = 'on' then return coalesce(new, old); end if;
  if tg_op = 'DELETE' then rid := old.id; else rid := new.id; end if;
  perform set_config('pe.sync', 'on', true);
  begin
    select * into cfg from pm_estate_sync_pairs where pair = p_pair;
    tbl := case p_side when 'pm' then cfg.ea_table else cfg.pm_table end;
    if tg_op = 'DELETE' then
      twin := pe_twin(p_pair, p_side, old.id);
      if twin is not null then execute format('delete from %I where id = $1', tbl) using twin; end if;
      delete from pm_estate_links where pair = p_pair and (case p_side when 'pm' then pm_id else ea_id end) = old.id;
    else
      twin := pe_twin(p_pair, p_side, new.id);
      if twin is null then
        if p_pair not in ('properties', 'tenants') then perform pe_create_twin(p_pair, p_side, new.id, to_jsonb(new)); end if;
      else
        perform pe_update_twin(p_pair, p_side, twin, to_jsonb(new));
      end if;
    end if;
  exception when others then
    insert into pm_estate_sync_errors(pair, side, op, row_id, error) values (p_pair, p_side, tg_op, rid, sqlerrm);
  end;
  perform set_config('pe.sync', '', true);
  return coalesce(new, old);
end $$;

-- Register a pair: auto-match same-named columns, add extras, attach triggers
create or replace function pe_register(p_pair text, p_pm text, p_ea text, p_extra jsonb default '[]', p_exclude text[] default '{}',
  p_pm_defaults jsonb default '{}', p_ea_defaults jsonb default '{}', p_match text[] default null)
returns void language plpgsql security definer set search_path = public as $$
declare cols jsonb := '[]'; r record; fkmap jsonb := '{"property_id":"properties","tenant_id":"tenants","unit_id":"units","building_id":"buildings","landlord_id":"landlords","account_id":"bank_accounts","tenancy_id":"leases","lease_id":"leases"}';
  base text[] := array['id','created_at','sign_token','estate_property_id','pm_property_id','estate_tenant_id','pm_tenant_id','owner_id'];
begin
  for r in
    select a.column_name from information_schema.columns a
    join information_schema.columns b on b.table_schema = 'public' and b.table_name = p_ea and b.column_name = a.column_name
    where a.table_schema = 'public' and a.table_name = p_pm
      and a.column_name <> all (base) and a.column_name <> all (p_exclude)
  loop
    cols := cols || jsonb_build_array(
      case when fkmap ? r.column_name then jsonb_build_object('pm', r.column_name, 'ea', r.column_name, 'fk', fkmap->>r.column_name)
           else jsonb_build_object('pm', r.column_name, 'ea', r.column_name) end);
  end loop;
  cols := cols || p_extra;
  insert into pm_estate_sync_pairs(pair, pm_table, ea_table, cols, pm_defaults, ea_defaults, match_cols)
    values (p_pair, p_pm, p_ea, cols, p_pm_defaults, p_ea_defaults, p_match)
    on conflict (pair) do update set pm_table = excluded.pm_table, ea_table = excluded.ea_table, cols = excluded.cols,
      pm_defaults = excluded.pm_defaults, ea_defaults = excluded.ea_defaults, match_cols = excluded.match_cols;
  execute format('drop trigger if exists pe_sync_trg on %I', p_pm);
  execute format('drop trigger if exists pe_sync_trg on %I', p_ea);
  execute format('create trigger pe_sync_trg after insert or update or delete on %I for each row execute function pe_sync(%L, %L)', p_pm, p_pair, 'pm');
  execute format('create trigger pe_sync_trg after insert or update or delete on %I for each row execute function pe_sync(%L, %L)', p_ea, p_pair, 'ea');
end $$;

-- Link or copy existing rows so both sides start identical
create or replace function pe_backfill(p_pair text) returns text
language plpgsql security definer set search_path = public as $$
declare cfg pm_estate_sync_pairs; r record; dst jsonb; m uuid; cond text; c text; linked int := 0; created int := 0;
begin
  select * into cfg from pm_estate_sync_pairs where pair = p_pair;
  perform set_config('pe.sync', 'on', true);
  -- pm rows without a twin: try to match an unlinked estate row, else create one
  for r in execute format('select id, to_jsonb(t) j from %I t where not exists (select 1 from pm_estate_links l where l.pair = %L and l.pm_id = t.id)', cfg.pm_table, p_pair) loop
    m := null;
    if cfg.match_cols is not null then
      dst := pe_translate(p_pair, 'pm', r.j);
      cond := '';
      foreach c in array cfg.match_cols loop
        cond := cond || format(' and lower(btrim(coalesce(e.%I::text, ''''))) = lower(btrim(coalesce(%L, '''')))', c, dst->>c);
      end loop;
      execute format('select e.id from %I e where not exists (select 1 from pm_estate_links l where l.pair = %L and l.ea_id = e.id) %s limit 1', cfg.ea_table, p_pair, cond) into m;
    end if;
    if m is not null then
      insert into pm_estate_links values (p_pair, r.id, m) on conflict do nothing; linked := linked + 1;
    else
      begin
        perform pe_create_twin(p_pair, 'pm', r.id, r.j); created := created + 1;
      exception when others then insert into pm_estate_sync_errors(pair, side, op, row_id, error) values (p_pair, 'pm', 'BACKFILL', r.id, sqlerrm);
      end;
    end if;
  end loop;
  -- estate rows still without a twin: create them on the pm side
  for r in execute format('select id, to_jsonb(t) j from %I t where not exists (select 1 from pm_estate_links l where l.pair = %L and l.ea_id = t.id)', cfg.ea_table, p_pair) loop
    begin
      perform pe_create_twin(p_pair, 'ea', r.id, r.j); created := created + 1;
    exception when others then insert into pm_estate_sync_errors(pair, side, op, row_id, error) values (p_pair, 'ea', 'BACKFILL', r.id, sqlerrm);
    end;
  end loop;
  perform set_config('pe.sync', '', true);
  return format('%s: linked %s, created %s', p_pair, linked, created);
end $$;

-- ---------- properties & tenants: existing twin triggers + deletes + logins ----------
create or replace function pe_sync_core_extra() returns trigger
language plpgsql security definer set search_path = public as $$
declare p_pair text := tg_argv[0]; p_side text := tg_argv[1]; twin uuid; tbl text; j jsonb; twincol text;
begin
  if coalesce(current_setting('pe.sync', true), '') = 'on' or pg_trigger_depth() > 1 then return coalesce(new, old); end if;
  if p_pair = 'properties' then
    tbl := case p_side when 'pm' then 'estate_properties' else 'pm_properties' end;
    twincol := case p_side when 'pm' then 'estate_property_id' else 'pm_property_id' end;
  else
    tbl := case p_side when 'pm' then 'estate_tenants' else 'pm_tenants' end;
    twincol := case p_side when 'pm' then 'estate_tenant_id' else 'pm_tenant_id' end;
  end if;
  if tg_op = 'DELETE' then j := to_jsonb(old); else j := to_jsonb(new); end if;
  twin := nullif(j->>twincol, '')::uuid;
  if twin is null then return coalesce(new, old); end if;
  perform set_config('pe.sync', 'on', true);
  begin
    if tg_op = 'DELETE' then
      execute format('delete from %I where id = $1', tbl) using twin;
    elsif p_pair = 'tenants' then
      execute format('update %I set portal_user_id = $1, emergency_contact_name = $2, emergency_contact_phone = $3, notify_email = $4, notify_sms = $5, dob = $6 where id = $7', tbl)
        using nullif(j->>'portal_user_id','')::uuid, j->>'emergency_contact_name', j->>'emergency_contact_phone',
              (j->>'notify_email')::boolean, (j->>'notify_sms')::boolean, nullif(j->>'dob','')::date, twin;
    else
      execute format('update %I set status = $1 where id = $2', tbl) using j->>'status', twin;
    end if;
  exception when others then
    insert into pm_estate_sync_errors(pair, side, op, row_id, error) values (p_pair, p_side, tg_op, (j->>'id')::uuid, sqlerrm);
  end;
  perform set_config('pe.sync', '', true);
  return coalesce(new, old);
end $$;

drop trigger if exists pe_core_trg on pm_properties;
create trigger pe_core_trg after update or delete on pm_properties for each row execute function pe_sync_core_extra('properties', 'pm');
drop trigger if exists pe_core_trg on estate_properties;
create trigger pe_core_trg after update or delete on estate_properties for each row execute function pe_sync_core_extra('properties', 'ea');
drop trigger if exists pe_core_trg on pm_tenants;
create trigger pe_core_trg after update or delete on pm_tenants for each row execute function pe_sync_core_extra('tenants', 'pm');
drop trigger if exists pe_core_trg on estate_tenants;
create trigger pe_core_trg after update or delete on estate_tenants for each row execute function pe_sync_core_extra('tenants', 'ea');

-- ---------- register every shared section ----------
select pe_register('bank_accounts', 'pm_bank_accounts', 'estate_bank_accounts', p_match => array['name']);
select pe_register('buildings', 'pm_buildings', 'estate_buildings', p_match => array['name']);
select pe_register('landlords', 'pm_landlords', 'estate_landlords', p_match => array['name']);
select pe_register('units', 'pm_units', 'estate_units', p_match => array['property_id', 'unit_number']);
select pe_register('leases', 'pm_leases', 'estate_tenancies',
  p_extra => '[{"pm":"monthly_rent","ea":"rent"}]', p_match => array['tenant_id', 'start_date']);
select pe_register('compliance', 'pm_compliance', 'estate_compliance', p_match => array['property_id', 'type', 'expiry_date']);
select pe_register('maintenance', 'pm_maintenance', 'estate_maintenance', p_match => array['property_id', 'title']);
select pe_register('cleaning', 'pm_cleaning_tasks', 'estate_cleaning_tasks', p_match => array['property_id', 'scheduled_date']);
select pe_register('documents', 'pm_documents', 'estate_documents',
  p_extra => '[{"pm":"url","ea":"file_url","only":"pm"},{"ea":"file_url","pm":"url","only":"ea"}]',
  p_pm_defaults => '{"url":""}', p_match => array['name']);
select pe_register('inspections', 'pm_inspections', 'estate_inventories',
  p_extra => '[{"pm":"scheduled_date","ea":"inspection_date"},{"pm":"notes","ea":"condition_summary"}]',
  p_match => array['property_id', 'inspection_date']);
select pe_register('rent', 'pm_rent_payments', 'estate_rent_schedules',
  p_extra => '[{"pm":"due_date","ea":"due_day","fn":"day","only":"pm"}]', p_match => array['tenant_id', 'amount']);
select pe_register('transactions', 'pm_transactions', 'estate_transactions', p_pm_defaults => '{"description":""}', p_match => array['description', 'date', 'amount']);
select pe_register('landlord_payments', 'pm_landlord_payments', 'estate_landlord_payments', p_ea_defaults => '{"amount":0}', p_match => array['landlord_id', 'amount', 'due_date']);
select pe_register('landlord_messages', 'pm_landlord_messages', 'estate_landlord_messages', p_match => array['landlord_id', 'message']);
select pe_register('tenant_messages', 'pm_tenant_messages', 'estate_tenant_messages', p_match => array['tenant_id', 'message']);
select pe_register('rtr_checks', 'pm_right_to_rent_checks', 'estate_right_to_rent_checks',
  p_extra => '[{"pm":"lease_id","ea":"tenancy_id","fk":"leases"}]', p_match => array['tenancy_id']);
select pe_register('bank_checks', 'pm_bank_statement_checks', 'estate_bank_statement_checks',
  p_extra => '[{"pm":"lease_id","ea":"tenancy_id","fk":"leases"}]', p_match => array['tenancy_id']);

-- ---------- one-off: link / copy everything that already exists ----------
select pe_backfill('bank_accounts'), pe_backfill('buildings'), pe_backfill('landlords'), pe_backfill('units'), pe_backfill('leases'),
  pe_backfill('compliance'), pe_backfill('maintenance'), pe_backfill('cleaning'), pe_backfill('documents'), pe_backfill('inspections'), pe_backfill('rent'),
  pe_backfill('transactions'), pe_backfill('landlord_payments'), pe_backfill('landlord_messages'), pe_backfill('tenant_messages'), pe_backfill('rtr_checks'), pe_backfill('bank_checks');

-- tenant logins: copy whichever side has one to the other
update estate_tenants e set portal_user_id = p.portal_user_id from pm_tenants p where p.estate_tenant_id = e.id and e.portal_user_id is null and p.portal_user_id is not null;
update pm_tenants p set portal_user_id = e.portal_user_id from estate_tenants e where p.estate_tenant_id = e.id and p.portal_user_id is null and e.portal_user_id is not null;

notify pgrst, 'reload schema';
