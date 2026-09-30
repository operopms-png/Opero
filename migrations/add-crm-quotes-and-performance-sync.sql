-- Sales is merged into the CRM:
--  * a Quotes board (client, property, agent, amount, valid until, status, department)
--  * a Department column on Transactions
--  * a Transactions deal set to a "won" status logs a Deal Closed win in
--    Staff Performance for each Agent on it (and removes it if the deal
--    moves off won or is deleted).

-- wins can now point at CRM items as well as old sales_deals rows
alter table staff_performance_wins drop constraint if exists staff_performance_wins_source_deal_id_fkey;

create or replace function crm_add_sales_boards(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  tx uuid; contacts uuid; props uuid; q uuid; pos int;
  dept jsonb := '[{"id":"d1","color":"#D0AE4C","label":"Vacation Rentals"},{"id":"d2","color":"#579BFC","label":"Property Management"},{"id":"d3","color":"#00C875","label":"Estate Agency"},{"id":"d4","color":"#9D50DD","label":"Developments"}]';
begin
  select id into tx from crm_boards where user_id = p_user and kind = 'transactions' limit 1;
  select id into contacts from crm_boards where user_id = p_user and kind = 'contacts' limit 1;
  select id into props from crm_boards where user_id = p_user and kind = 'properties' limit 1;

  -- Department on Transactions (after Contract type)
  if tx is not null and not exists (select 1 from crm_board_columns where board_id = tx and key = 'module') then
    select coalesce((select position from crm_board_columns where board_id = tx and key = 'contract_type'), 4) into pos;
    update crm_board_columns set position = position + 1 where board_id = tx and position > pos;
    insert into crm_board_columns (board_id, user_id, key, title, type, settings, position, width)
    values (tx, p_user, 'module', 'Department', 'status', jsonb_build_object('labels', dept), pos + 1, 170);
  end if;

  -- Quotes board
  if not exists (select 1 from crm_boards where user_id = p_user and kind = 'quotes') then
    select coalesce(max(position), 0) + 1 into pos from crm_boards where user_id = p_user;
    insert into crm_boards (user_id, name, kind, item_label, position) values (p_user, 'Quotes', 'quotes', 'quote', pos) returning id into q;
    insert into crm_board_columns (board_id, user_id, key, title, type, settings, position, width) values
      (q, p_user, 'agent', 'Agent', 'person', '{}', 1, 110),
      (q, p_user, 'client', 'Client', 'link', case when contacts is null then '{}'::jsonb else jsonb_build_object('board_id', contacts) end, 2, 190),
      (q, p_user, 'property', 'Property', 'link', case when props is null then '{}'::jsonb else jsonb_build_object('board_id', props) end, 3, 190),
      (q, p_user, 'amount', 'Amount', 'number', '{"sum": true, "currency": "£"}', 4, 130),
      (q, p_user, 'status', 'Status', 'status', '{"labels":[{"id":"q1","color":"#C4C4C4","label":"Draft"},{"id":"q2","color":"#FDAB3D","label":"Sent"},{"id":"q3","color":"#00C875","label":"Accepted"},{"id":"q4","color":"#DF2F4A","label":"Declined"},{"id":"q5","color":"#757575","label":"Expired"}]}', 5, 140),
      (q, p_user, 'sent_date', 'Sent', 'date', '{}', 6, 130),
      (q, p_user, 'valid_until', 'Valid until', 'date', '{}', 7, 130),
      (q, p_user, 'module', 'Department', 'status', jsonb_build_object('labels', dept), 8, 170),
      (q, p_user, 'quote_file', 'Quote document', 'file', '{}', 9, 150),
      (q, p_user, 'notes', 'Notes', 'text', '{}', 10, 220);
    insert into crm_board_groups (board_id, user_id, key, title, color, position) values
      (q, p_user, 'open', 'Open quotes', '#FDAB3D', 1),
      (q, p_user, 'accepted', 'Accepted', '#00C875', 2),
      (q, p_user, 'closed', 'Declined / expired', '#C4C4C4', 3);
  end if;
end $$;

select crm_add_sales_boards(user_id) from (select distinct user_id from crm_boards) u;

-- Transactions -> Staff Performance
create or replace function crm_sync_deal_win(it crm_board_items) returns void
language plpgsql security definer set search_path = public as $$
declare
  st_col crm_board_columns; md_col crm_board_columns; ag_col uuid; pr_col uuid; cd_col uuid;
  st_label text; is_won boolean := false; names text[]; mod text; price numeric; closed date; n text;
begin
  delete from staff_performance_wins where source_deal_id = it.id and notes like 'Auto-logged from CRM%';

  select * into st_col from crm_board_columns where board_id = it.board_id and key = 'status';
  select id into ag_col from crm_board_columns where board_id = it.board_id and key = 'agent';
  select id into pr_col from crm_board_columns where board_id = it.board_id and key = 'price';
  select id into cd_col from crm_board_columns where board_id = it.board_id and key = 'close_date';
  select * into md_col from crm_board_columns where board_id = it.board_id and key = 'module';
  if st_col.id is null then return; end if;

  select l->>'label' into st_label from jsonb_array_elements(coalesce(st_col.settings->'labels', '[]')) l where l->>'id' = it.values->>st_col.id::text;
  is_won := lower(coalesce(st_label, '')) like '%won%';
  if not is_won then return; end if;

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

  foreach n in array names loop
    insert into staff_performance_wins (user_id, staff_name, category, title, value, module, date_achieved, notes, source_deal_id)
    values (it.user_id, n, 'Deal Closed', coalesce(nullif(it.name, ''), 'Deal'), price, mod, coalesce(closed, current_date), 'Auto-logged from CRM Transactions', it.id);
  end loop;
end $$;

create or replace function crm_deal_to_performance() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select kind from crm_boards where id = coalesce(new.board_id, old.board_id)) is distinct from 'transactions' then return null; end if;
  if tg_op = 'DELETE' then
    delete from staff_performance_wins where source_deal_id = old.id and notes like 'Auto-logged from CRM%';
    return null;
  end if;
  if tg_op = 'UPDATE' and new.values is not distinct from old.values and new.name is not distinct from old.name then return null; end if;
  -- never let performance logging block a CRM edit
  begin perform crm_sync_deal_win(new); exception when others then raise warning 'crm_deal_to_performance: %', sqlerrm; end;
  return null;
end $$;

drop trigger if exists crm_deal_to_performance on crm_board_items;
create trigger crm_deal_to_performance after insert or update or delete on crm_board_items
  for each row execute function crm_deal_to_performance();

-- log any deals that are already won
select crm_sync_deal_win(i) from crm_board_items i join crm_boards b on b.id = i.board_id where b.kind = 'transactions';

notify pgrst, 'reload schema';
