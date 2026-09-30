-- Staff Performance: the value of a win that came from a CRM deal can be edited;
-- the edit is written back to the deal's Price. Deal re-syncs now update wins in
-- place (same row) instead of delete + re-insert.

create or replace function crm_sync_deal_win(it crm_board_items) returns void
language plpgsql security definer set search_path = public as $$
declare
  st_col crm_board_columns; md_col crm_board_columns; ag_col uuid; pr_col uuid; cd_col uuid;
  st_label text; is_won boolean := false; names text[]; mod text; price numeric; closed date; n text;
begin
  select * into st_col from crm_board_columns where board_id = it.board_id and key = 'status';
  select id into ag_col from crm_board_columns where board_id = it.board_id and key = 'agent';
  select id into pr_col from crm_board_columns where board_id = it.board_id and key = 'price';
  select id into cd_col from crm_board_columns where board_id = it.board_id and key = 'close_date';
  select * into md_col from crm_board_columns where board_id = it.board_id and key = 'module';
  if st_col.id is not null then
    select l->>'label' into st_label from jsonb_array_elements(coalesce(st_col.settings->'labels', '[]')) l where l->>'id' = it.values->>st_col.id::text;
    is_won := lower(coalesce(st_label, '')) like '%won%';
  end if;
  if not is_won then
    delete from staff_performance_wins where source_deal_id = it.id and notes like 'Auto-logged from CRM%';
    return;
  end if;
  if ag_col is not null and jsonb_typeof(it.values->ag_col::text) = 'array' then
    select array_agg(p->>'name') into names from jsonb_array_elements(it.values->ag_col::text) p where coalesce(p->>'name', '') <> '';
  end if;
  if names is null or array_length(names, 1) is null then names := array['Unassigned']; end if;
  begin price := nullif(it.values->>pr_col::text, '')::numeric; exception when others then price := null; end;
  begin closed := nullif(it.values->>cd_col::text, '')::date; exception when others then closed := null; end;
  if md_col.id is not null then
    select case lower(l->>'label') when 'vacation rentals' then 'str' when 'property management' then 'pm' when 'estate agency' then 'estate' when 'developments' then 'dev' end
      into mod from jsonb_array_elements(coalesce(md_col.settings->'labels', '[]')) l where l->>'id' = it.values->>md_col.id::text;
  end if;
  delete from staff_performance_wins where source_deal_id = it.id and notes like 'Auto-logged from CRM%' and not (staff_name = any(names));
  foreach n in array names loop
    update staff_performance_wins set title = coalesce(nullif(it.name, ''), 'Deal'), value = price, module = mod, date_achieved = coalesce(closed, date_achieved)
      where source_deal_id = it.id and staff_name = n and notes like 'Auto-logged from CRM%';
    if not found then
      insert into staff_performance_wins (user_id, staff_name, category, title, value, module, date_achieved, notes, source_deal_id)
      values (it.user_id, n, 'Deal Closed', coalesce(nullif(it.name, ''), 'Deal'), price, mod, coalesce(closed, current_date), 'Auto-logged from CRM Transactions', it.id);
    end if;
  end loop;
end $$;

create or replace function perf_win_value_to_deal() returns trigger
language plpgsql security definer set search_path = public as $$
declare pr_col uuid;
begin
  if pg_trigger_depth() > 1 then return null; end if;
  if new.source_deal_id is null or coalesce(new.notes, '') not like 'Auto-logged from CRM%' then return null; end if;
  if new.value is not distinct from old.value then return null; end if;
  select c.id into pr_col from crm_board_items i join crm_board_columns c on c.board_id = i.board_id and c.key = 'price' where i.id = new.source_deal_id;
  if pr_col is null then return null; end if;
  update crm_board_items set values = case when new.value is null then values - pr_col::text else values || jsonb_build_object(pr_col::text, new.value) end
    where id = new.source_deal_id;
  return null;
end $$;
drop trigger if exists perf_win_value_to_deal on staff_performance_wins;
create trigger perf_win_value_to_deal after update of value on staff_performance_wins
  for each row execute function perf_win_value_to_deal();
