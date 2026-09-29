-- CRM boards: customisable boards (Contacts, Properties, Tasks, Transactions, custom)
-- with groups, typed columns and items. Existing crm_contacts / crm_deals stay the
-- source other features read from; triggers keep them in sync with board items.

create table if not exists crm_boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  kind text not null default 'custom',
  item_label text not null default 'item',
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists crm_board_columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references crm_boards(id) on delete cascade,
  user_id uuid not null,
  key text,
  title text not null,
  type text not null,
  settings jsonb not null default '{}'::jsonb,
  position int not null default 0,
  width int not null default 150,
  created_at timestamptz not null default now()
);

create table if not exists crm_board_groups (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references crm_boards(id) on delete cascade,
  user_id uuid not null,
  key text,
  title text not null,
  color text not null default '#579BFC',
  position int not null default 0,
  collapsed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists crm_board_items (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references crm_boards(id) on delete cascade,
  group_id uuid references crm_board_groups(id) on delete cascade,
  user_id uuid not null,
  name text not null default '',
  "values" jsonb not null default '{}'::jsonb,
  position double precision not null default 0,
  crm_contact_id uuid unique,
  crm_deal_id uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_board_item_updates (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references crm_board_items(id) on delete cascade,
  user_id uuid not null,
  author text,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists crm_board_columns_board_idx on crm_board_columns(board_id);
create index if not exists crm_board_groups_board_idx on crm_board_groups(board_id);
create index if not exists crm_board_items_board_idx on crm_board_items(board_id);
create index if not exists crm_board_items_user_idx on crm_board_items(user_id);
create index if not exists crm_board_item_updates_item_idx on crm_board_item_updates(item_id);

alter table crm_boards enable row level security;
alter table crm_board_columns enable row level security;
alter table crm_board_groups enable row level security;
alter table crm_board_items enable row level security;
alter table crm_board_item_updates enable row level security;

do $$
declare t text;
begin
  foreach t in array array['crm_boards','crm_board_columns','crm_board_groups','crm_board_items','crm_board_item_updates'] loop
    if not exists (select 1 from pg_policies where tablename = t and policyname = t || '_business') then
      execute format($p$create policy %I on %I for all
        using ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))))
        with check ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))))$p$,
        t || '_business', t);
    end if;
  end loop;
end $$;

-- ---------- helpers ----------

create or replace function crm_num(t text) returns numeric language sql immutable as $$
  select nullif(regexp_replace(coalesce(t,''), '[^0-9.]', '', 'g'), '')::numeric
$$;

create or replace function crm_first_url(t text) returns text language plpgsql immutable as $$
begin
  if t is null or btrim(t) = '' then return null; end if;
  if left(btrim(t),1) = '[' then return (t::jsonb)->>0; end if;
  if left(btrim(t),1) = '{' then return (string_to_array(trim(both '{}' from t), ','))[1]; end if;
  return split_part(t, ',', 1);
exception when others then return null;
end $$;

-- Label id for a status column, adding the label if it doesn't exist yet
create or replace function crm_board_label_id(p_column uuid, p_label text)
returns text language plpgsql as $$
declare s jsonb; lid text;
begin
  if p_label is null or btrim(p_label) = '' then return null; end if;
  select settings into s from crm_board_columns where id = p_column;
  select l->>'id' into lid from jsonb_array_elements(coalesce(s->'labels','[]'::jsonb)) l
    where lower(l->>'label') = lower(btrim(p_label)) limit 1;
  if lid is null then
    lid := 'l' || substr(md5(random()::text), 1, 8);
    update crm_board_columns
      set settings = jsonb_set(coalesce(settings,'{}'::jsonb), '{labels}',
        coalesce(settings->'labels','[]'::jsonb) || jsonb_build_array(jsonb_build_object('id', lid, 'label', btrim(p_label), 'color', '#C4C4C4')))
      where id = p_column;
  end if;
  return lid;
end $$;

create or replace function crm_board_label_text(p_column uuid, p_id text)
returns text language sql stable as $$
  select l->>'label' from crm_board_columns c, jsonb_array_elements(coalesce(c.settings->'labels','[]'::jsonb)) l
  where c.id = p_column and l->>'id' = p_id limit 1
$$;

create or replace function crm_board_col(p_board uuid, p_key text)
returns uuid language sql stable as $$
  select id from crm_board_columns where board_id = p_board and key = p_key limit 1
$$;

create or replace function crm_deal_status_label(stage text) returns text language sql immutable as $$
  select case lower(coalesce(stage,''))
    when 'won' then 'Closed won' when 'closed won' then 'Closed won'
    when 'lost' then 'Closed lost' when 'closed lost' then 'Closed lost'
    when 'offer' then 'In negotiation' when 'negotiation' then 'In negotiation'
    when '' then 'Pending' else initcap(stage) end
$$;

create or replace function crm_deal_stage_from_label(lbl text) returns text language sql immutable as $$
  select case lbl when 'Closed won' then 'Won' when 'Closed lost' then 'Lost' when 'In negotiation' then 'Negotiation' else lbl end
$$;

-- ---------- contacts sync ----------

create or replace function crm_contact_values(p_board uuid, c crm_contacts)
returns jsonb language plpgsql as $$
declare v jsonb := '{}'::jsonb; col uuid;
begin
  col := crm_board_col(p_board, 'phone'); if col is not null and c.phone is not null then v := v || jsonb_build_object(col::text, c.phone); end if;
  col := crm_board_col(p_board, 'email'); if col is not null and c.email is not null then v := v || jsonb_build_object(col::text, c.email); end if;
  col := crm_board_col(p_board, 'notes'); if col is not null and c.notes is not null then v := v || jsonb_build_object(col::text, c.notes); end if;
  col := crm_board_col(p_board, 'source'); if col is not null and c.source is not null then v := v || jsonb_build_object(col::text, c.source); end if;
  col := crm_board_col(p_board, 'contact_type');
  if col is not null and c.type is not null and lower(c.type) <> 'contact' then
    v := v || jsonb_build_object(col::text, crm_board_label_id(col, initcap(c.type)));
  end if;
  col := crm_board_col(p_board, 'module');
  if col is not null and c.module is not null then
    v := v || jsonb_build_object(col::text, crm_board_label_id(col, case lower(c.module)
      when 'str' then 'Vacation Rentals' when 'pm' then 'Property Management'
      when 'estate' then 'Estate Agency' when 'ea' then 'Estate Agency' when 'dev' then 'Developments' else initcap(c.module) end));
  end if;
  return v;
end $$;

create or replace function crm_contacts_to_board() returns trigger language plpgsql security definer set search_path = public as $$
declare b uuid; g uuid;
begin
  if pg_trigger_depth() > 1 or new.user_id is null then return new; end if;
  select id into b from crm_boards where user_id = new.user_id and kind = 'contacts' order by position limit 1;
  if b is null then return new; end if;
  if tg_op = 'INSERT' then
    select id into g from crm_board_groups where board_id = b and key = 'new' limit 1;
    if g is null then select id into g from crm_board_groups where board_id = b order by position limit 1; end if;
    insert into crm_board_items(board_id, group_id, user_id, name, "values", position, crm_contact_id)
      values (b, g, new.user_id, coalesce(nullif(new.name,''), new.email, 'New contact'), crm_contact_values(b, new),
              -extract(epoch from now()), new.id)
      on conflict (crm_contact_id) do nothing;
  else
    update crm_board_items set name = coalesce(nullif(new.name,''), name),
      "values" = "values" || crm_contact_values(b, new), updated_at = now()
      where crm_contact_id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists crm_contacts_to_board on crm_contacts;
create trigger crm_contacts_to_board after insert or update on crm_contacts
  for each row execute function crm_contacts_to_board();

create or replace function crm_board_items_to_contacts() returns trigger language plpgsql security definer set search_path = public as $$
declare b crm_boards; col uuid; v jsonb;
begin
  if pg_trigger_depth() > 1 then return new; end if;
  select * into b from crm_boards where id = new.board_id;
  v := new."values";
  if b.kind = 'contacts' then
    if new.crm_contact_id is null and tg_op = 'INSERT' then
      insert into crm_contacts(user_id, name, email, phone, type, notes, source, status)
        values (new.user_id, new.name, v->>crm_board_col(b.id,'email')::text, v->>crm_board_col(b.id,'phone')::text,
                crm_board_label_text(crm_board_col(b.id,'contact_type'), v->>crm_board_col(b.id,'contact_type')::text),
                v->>crm_board_col(b.id,'notes')::text, coalesce(v->>crm_board_col(b.id,'source')::text, 'CRM board'), 'active')
        returning id into new.crm_contact_id;
      update crm_board_items set crm_contact_id = new.crm_contact_id where id = new.id;
    elsif new.crm_contact_id is not null and tg_op = 'UPDATE' then
      update crm_contacts set name = new.name,
        email = v->>crm_board_col(b.id,'email')::text,
        phone = v->>crm_board_col(b.id,'phone')::text,
        notes = v->>crm_board_col(b.id,'notes')::text,
        type = coalesce(crm_board_label_text(crm_board_col(b.id,'contact_type'), v->>crm_board_col(b.id,'contact_type')::text), type)
        where id = new.crm_contact_id;
    end if;
  elsif b.kind = 'transactions' and new.crm_deal_id is not null and tg_op = 'UPDATE' then
    col := crm_board_col(b.id, 'price');
    update crm_deals set name = new.name,
      value = nullif(v->>col::text, '')::numeric,
      stage = coalesce(crm_deal_stage_from_label(crm_board_label_text(crm_board_col(b.id,'status'), v->>crm_board_col(b.id,'status')::text)), stage),
      close_date = nullif(v->>crm_board_col(b.id,'close_date')::text, '')::date
      where id = new.crm_deal_id;
  end if;
  return new;
end $$;

drop trigger if exists crm_board_items_to_contacts on crm_board_items;
create trigger crm_board_items_to_contacts after insert or update on crm_board_items
  for each row execute function crm_board_items_to_contacts();

-- ---------- deals sync (new deals created elsewhere appear on Transactions) ----------

create or replace function crm_deals_to_board() returns trigger language plpgsql security definer set search_path = public as $$
declare b uuid; g uuid; v jsonb := '{}'::jsonb; col uuid; lbl text; contact_item uuid;
begin
  if pg_trigger_depth() > 1 or new.user_id is null then return new; end if;
  select id into b from crm_boards where user_id = new.user_id and kind = 'transactions' order by position limit 1;
  if b is null then return new; end if;
  lbl := crm_deal_status_label(new.stage);
  col := crm_board_col(b,'status'); if col is not null then v := v || jsonb_build_object(col::text, crm_board_label_id(col, lbl)); end if;
  col := crm_board_col(b,'price'); if col is not null and new.value is not null then v := v || jsonb_build_object(col::text, new.value); end if;
  col := crm_board_col(b,'close_date'); if col is not null and new.close_date is not null then v := v || jsonb_build_object(col::text, new.close_date::text); end if;
  col := crm_board_col(b,'contact');
  if col is not null and new.contact_id is not null then
    select id into contact_item from crm_board_items where crm_contact_id = new.contact_id limit 1;
    if contact_item is not null then v := v || jsonb_build_object(col::text, jsonb_build_array(contact_item)); end if;
  end if;
  if tg_op = 'INSERT' then
    select id into g from crm_board_groups where board_id = b and key = case when lbl in ('Closed won','Closed lost') then 'completed' else 'pending' end limit 1;
    if g is null then select id into g from crm_board_groups where board_id = b order by position limit 1; end if;
    insert into crm_board_items(board_id, group_id, user_id, name, "values", position, crm_deal_id)
      values (b, g, new.user_id, coalesce(nullif(new.name,''),'New deal'), v, -extract(epoch from now()), new.id)
      on conflict (crm_deal_id) do nothing;
  else
    update crm_board_items set name = coalesce(nullif(new.name,''), name), "values" = "values" || v, updated_at = now()
      where crm_deal_id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists crm_deals_to_board on crm_deals;
create trigger crm_deals_to_board after insert or update on crm_deals
  for each row execute function crm_deals_to_board();

-- ---------- default boards ----------

create or replace function crm_add_col(p_board uuid, p_user uuid, p_key text, p_title text, p_type text, p_settings jsonb, p_pos int, p_width int default 150)
returns uuid language plpgsql as $$
declare cid uuid;
begin
  insert into crm_board_columns(board_id, user_id, key, title, type, settings, position, width)
    values (p_board, p_user, p_key, p_title, p_type, coalesce(p_settings,'{}'::jsonb), p_pos, p_width) returning id into cid;
  return cid;
end $$;

create or replace function crm_labels(variadic pairs text[]) returns jsonb language plpgsql immutable as $$
declare out jsonb := '[]'::jsonb; i int := 1;
begin
  while i < array_length(pairs,1) loop
    out := out || jsonb_build_array(jsonb_build_object('id', 'l' || ((i+1)/2), 'label', pairs[i], 'color', pairs[i+1]));
    i := i + 2;
  end loop;
  return out;
end $$;

create or replace function crm_seed_default_boards(p_user uuid)
returns void language plpgsql as $$
declare
  b_contacts uuid; b_props uuid; b_tasks uuid; b_tx uuid;
  c_phone uuid; c_email uuid; c_ctype uuid; c_cprop uuid; c_cagent uuid; c_next uuid; c_csigned uuid; c_cptype uuid; c_notes uuid; c_module uuid; c_source uuid;
  p_ptype uuid; p_ctype uuid; p_contract uuid; p_agent uuid; p_renew uuid; p_addr uuid; p_price uuid; p_sqft uuid; p_ppsf uuid; p_beds uuid; p_baths uuid; p_balcony uuid; p_parking uuid; p_media uuid; p_tx uuid; p_contacts uuid; p_signed uuid; p_ad uuid; p_tasks uuid;
  t_owner uuid; t_status uuid; t_due uuid; t_prop uuid; t_contact uuid; t_type uuid; t_desc uuid; t_tx uuid;
  x_agent uuid; x_close uuid; x_prop uuid; x_ctype uuid; x_price uuid; x_comm uuid; x_status uuid; x_addr uuid; x_media uuid; x_tasks uuid; x_contact uuid;
  g_new uuid; g_clients uuid; g_ref uuid; g_port uuid; g_open uuid; g_done uuid; g_pend uuid; g_comp uuid;
  r record; rc crm_contacts; v jsonb; n int;
begin
  if exists (select 1 from crm_boards where user_id = p_user) then return; end if;

  insert into crm_boards(user_id, name, kind, item_label, position) values (p_user, 'Contacts', 'contacts', 'contact', 1) returning id into b_contacts;
  insert into crm_boards(user_id, name, kind, item_label, position) values (p_user, 'Properties', 'properties', 'property', 2) returning id into b_props;
  insert into crm_boards(user_id, name, kind, item_label, position) values (p_user, 'Tasks', 'tasks', 'task', 3) returning id into b_tasks;
  insert into crm_boards(user_id, name, kind, item_label, position) values (p_user, 'Transactions', 'transactions', 'transaction / deal', 4) returning id into b_tx;

  -- Contacts
  c_phone  := crm_add_col(b_contacts, p_user, 'phone', 'Phone', 'phone', '{}', 1, 140);
  c_email  := crm_add_col(b_contacts, p_user, 'email', 'Email', 'email', '{}', 2, 190);
  c_ctype  := crm_add_col(b_contacts, p_user, 'contact_type', 'Type of contact', 'status', jsonb_build_object('labels', crm_labels(
                'Lead','#9D50DD','Tenant','#784BD1','Landlord','#579BFC','Buyer','#00C875','Seller','#FDAB3D','Investor','#225091','Partner','#FF642E','Agent','#66CCFF')), 3, 140);
  c_cprop  := crm_add_col(b_contacts, p_user, 'property', 'Property', 'link', '{}', 4, 150);
  c_cagent := crm_add_col(b_contacts, p_user, 'agent', 'Agent', 'person', '{}', 5, 110);
  c_next   := crm_add_col(b_contacts, p_user, 'next_interaction', 'Next interaction', 'date', '{}', 6, 130);
  c_csigned:= crm_add_col(b_contacts, p_user, 'signed_contract', 'Signed contract', 'file', '{}', 7, 130);
  c_cptype := crm_add_col(b_contacts, p_user, 'property_type', 'Property type', 'status', jsonb_build_object('labels', crm_labels(
                'Building','#225091','Apartment unit','#0086C0','House','#401694','Villa','#00C875','Commercial','#FDAB3D','Land','#7F5347')), 8, 140);
  c_module := crm_add_col(b_contacts, p_user, 'module', 'Department', 'status', jsonb_build_object('labels', crm_labels(
                'Vacation Rentals','#D0AE4C','Property Management','#579BFC','Estate Agency','#00C875','Developments','#9D50DD')), 9, 160);
  c_source := crm_add_col(b_contacts, p_user, 'source', 'Source', 'text', '{}', 10, 140);
  c_notes  := crm_add_col(b_contacts, p_user, 'notes', 'Notes', 'text', '{}', 11, 220);

  insert into crm_board_groups(board_id, user_id, key, title, color, position) values (b_contacts, p_user, 'new', 'New enquiries', '#D0AE4C', 1) returning id into g_new;
  insert into crm_board_groups(board_id, user_id, key, title, color, position) values (b_contacts, p_user, 'clients', 'Clients', '#579BFC', 2) returning id into g_clients;
  insert into crm_board_groups(board_id, user_id, key, title, color, position) values (b_contacts, p_user, 'referrals', 'Referrals', '#FF5AC4', 3) returning id into g_ref;

  -- Properties
  p_ptype  := crm_add_col(b_props, p_user, 'property_type', 'Property type', 'status', jsonb_build_object('labels', crm_labels(
                'Building','#225091','Apartment unit','#0086C0','House','#401694','Villa','#00C875','Commercial','#FDAB3D','Land','#7F5347')), 1, 130);
  p_ctype  := crm_add_col(b_props, p_user, 'contract_type', 'Contract type', 'status', jsonb_build_object('labels', crm_labels(
                'Buy','#A1B4C6','Rent','#6CA6C9','Short let','#D0AE4C','Management','#579BFC','Guaranteed rent','#00C875')), 2, 130);
  p_contract := crm_add_col(b_props, p_user, 'contract', 'Contract', 'file', '{}', 3, 110);
  p_agent  := crm_add_col(b_props, p_user, 'agent', 'Agent', 'person', '{}', 4, 100);
  p_renew  := crm_add_col(b_props, p_user, 'renewal_date', 'Renewal date', 'date', '{}', 5, 120);
  p_addr   := crm_add_col(b_props, p_user, 'address', 'Address', 'location', '{}', 6, 220);
  p_price  := crm_add_col(b_props, p_user, 'price', 'Price', 'number', '{"currency":"£","sum":true}', 7, 120);
  p_sqft   := crm_add_col(b_props, p_user, 'sqft', 'Sqft', 'number', '{}', 8, 90);
  p_ppsf   := crm_add_col(b_props, p_user, 'price_per_sqft', 'Price per sqft', 'formula', '{}', 9, 120);
  update crm_board_columns set settings = jsonb_build_object('op','/','a',p_price::text,'b',p_sqft::text,'currency','£') where id = p_ppsf;
  p_beds   := crm_add_col(b_props, p_user, 'bedrooms', 'Bedrooms', 'number', '{}', 10, 100);
  p_baths  := crm_add_col(b_props, p_user, 'bathrooms', 'Bathrooms', 'number', '{}', 11, 100);
  p_balcony:= crm_add_col(b_props, p_user, 'balcony', 'Balcony', 'checkbox', '{}', 12, 90);
  p_parking:= crm_add_col(b_props, p_user, 'parking', 'Parking', 'checkbox', '{}', 13, 90);
  p_media  := crm_add_col(b_props, p_user, 'media', 'Media', 'file', '{}', 14, 130);
  p_tx     := crm_add_col(b_props, p_user, 'transactions', 'Transactions', 'link', '{}', 15, 140);
  p_contacts := crm_add_col(b_props, p_user, 'contacts', 'Contacts', 'link', '{}', 16, 140);
  p_signed := crm_add_col(b_props, p_user, 'signed_contract', 'Signed contract', 'file', '{}', 17, 130);
  p_ad     := crm_add_col(b_props, p_user, 'ad_link', 'Link to ad', 'url', '{}', 18, 140);
  p_tasks  := crm_add_col(b_props, p_user, 'tasks', 'Related tasks', 'link', '{}', 19, 140);
  insert into crm_board_groups(board_id, user_id, key, title, color, position) values (b_props, p_user, 'portfolio', 'Portfolio', '#579BFC', 1) returning id into g_port;

  -- Tasks
  t_owner  := crm_add_col(b_tasks, p_user, 'owner', 'Owner', 'person', '{}', 1, 100);
  t_status := crm_add_col(b_tasks, p_user, 'status', 'Status', 'status', jsonb_build_object('labels', crm_labels(
                'Working on it','#FDAB3D','Stuck','#DF2F4A','Done','#00C875','Not started','#C4C4C4')), 2, 130);
  t_due    := crm_add_col(b_tasks, p_user, 'due_date', 'Due date', 'date', '{}', 3, 120);
  t_prop   := crm_add_col(b_tasks, p_user, 'property', 'Property related', 'link', '{}', 4, 140);
  t_contact:= crm_add_col(b_tasks, p_user, 'contact', 'Contact related', 'link', '{}', 5, 140);
  t_type   := crm_add_col(b_tasks, p_user, 'type', 'Type', 'status', jsonb_build_object('labels', crm_labels(
                'Tenant request','#225091','Client meeting','#0086C0','Bank meeting','#579BFC','Open house','#66CCFF','Private showing','#784BD1','Viewing','#D0AE4C','Maintenance','#FF642E')), 6, 140);
  t_desc   := crm_add_col(b_tasks, p_user, 'description', 'Task description', 'text', '{}', 7, 240);
  t_tx     := crm_add_col(b_tasks, p_user, 'transactions', 'Transactions', 'link', '{}', 8, 140);
  insert into crm_board_groups(board_id, user_id, key, title, color, position) values (b_tasks, p_user, 'open', 'Open tasks', '#579BFC', 1) returning id into g_open;
  insert into crm_board_groups(board_id, user_id, key, title, color, position) values (b_tasks, p_user, 'done', 'Completed tasks', '#00C875', 2) returning id into g_done;

  -- Transactions
  x_agent  := crm_add_col(b_tx, p_user, 'agent', 'Agent', 'person', '{}', 1, 100);
  x_close  := crm_add_col(b_tx, p_user, 'close_date', 'Close date', 'date', '{}', 2, 120);
  x_prop   := crm_add_col(b_tx, p_user, 'property', 'Property', 'link', '{}', 3, 140);
  x_ctype  := crm_add_col(b_tx, p_user, 'contract_type', 'Contract type', 'status', jsonb_build_object('labels', crm_labels(
                'Buy','#A1B4C6','Rent','#6CA6C9','Short let','#D0AE4C','Management','#579BFC','Guaranteed rent','#00C875')), 4, 120);
  x_price  := crm_add_col(b_tx, p_user, 'price', 'Price', 'number', '{"currency":"£","sum":true}', 5, 120);
  x_comm   := crm_add_col(b_tx, p_user, 'commission', 'Commission', 'number', '{"currency":"£","sum":true}', 6, 120);
  x_status := crm_add_col(b_tx, p_user, 'status', 'Status', 'status', jsonb_build_object('labels', crm_labels(
                'Enquiry','#FFCB00','Lead','#9D50DD','Contacted','#579BFC','Viewing','#66CCFF','Contract sent','#9CD326','In negotiation','#FF642E','Pending','#C4C4C4','Closed won','#00C875','Closed lost','#DF2F4A')), 7, 130);
  x_addr   := crm_add_col(b_tx, p_user, 'address', 'Address', 'location', '{}', 8, 200);
  x_media  := crm_add_col(b_tx, p_user, 'media', 'Property media', 'file', '{}', 9, 130);
  x_tasks  := crm_add_col(b_tx, p_user, 'tasks', 'Link to tasks', 'link', '{}', 10, 130);
  x_contact:= crm_add_col(b_tx, p_user, 'contact', 'Contact', 'link', '{}', 11, 140);
  insert into crm_board_groups(board_id, user_id, key, title, color, position) values (b_tx, p_user, 'pending', 'Pending', '#579BFC', 1) returning id into g_pend;
  insert into crm_board_groups(board_id, user_id, key, title, color, position) values (b_tx, p_user, 'completed', 'Completed', '#00C875', 2) returning id into g_comp;

  -- Two-way link pairs
  update crm_board_columns set settings = jsonb_build_object('board_id', b_props, 'pair_column_id', p_contacts) where id = c_cprop;
  update crm_board_columns set settings = jsonb_build_object('board_id', b_contacts, 'pair_column_id', c_cprop) where id = p_contacts;
  update crm_board_columns set settings = jsonb_build_object('board_id', b_tx, 'pair_column_id', x_prop) where id = p_tx;
  update crm_board_columns set settings = jsonb_build_object('board_id', b_props, 'pair_column_id', p_tx) where id = x_prop;
  update crm_board_columns set settings = jsonb_build_object('board_id', b_tasks, 'pair_column_id', t_prop) where id = p_tasks;
  update crm_board_columns set settings = jsonb_build_object('board_id', b_props, 'pair_column_id', p_tasks) where id = t_prop;
  update crm_board_columns set settings = jsonb_build_object('board_id', b_tx, 'pair_column_id', x_tasks) where id = t_tx;
  update crm_board_columns set settings = jsonb_build_object('board_id', b_tasks, 'pair_column_id', t_tx) where id = x_tasks;
  update crm_board_columns set settings = jsonb_build_object('board_id', b_contacts) where id = t_contact;
  update crm_board_columns set settings = jsonb_build_object('board_id', b_contacts) where id = x_contact;

  -- Import existing contacts
  n := 0;
  for rc in select * from crm_contacts where user_id = p_user order by created_at loop
    n := n + 1;
    insert into crm_board_items(board_id, group_id, user_id, name, "values", position, crm_contact_id, created_at)
      values (b_contacts, case when lower(coalesce(rc.type,'')) in ('lead','contact','') then g_new else g_clients end,
              p_user, coalesce(nullif(rc.name,''), rc.email, 'Contact'), crm_contact_values(b_contacts, rc), n, rc.id, rc.created_at);
  end loop;

  -- Import existing deals
  n := 0;
  for r in select d.*, crm_deal_status_label(d.stage) lbl,
             (select i.id from crm_board_items i where i.crm_contact_id = d.contact_id limit 1) contact_item
           from crm_deals d where d.user_id = p_user order by d.created_at loop
    n := n + 1;
    v := jsonb_build_object(x_status::text, crm_board_label_id(x_status, r.lbl));
    if r.value is not null then v := v || jsonb_build_object(x_price::text, r.value); end if;
    if r.close_date is not null then v := v || jsonb_build_object(x_close::text, r.close_date::text); end if;
    if r.contact_item is not null then v := v || jsonb_build_object(x_contact::text, jsonb_build_array(r.contact_item)); end if;
    if r.module is not null then
      v := v || jsonb_build_object(x_ctype::text, crm_board_label_id(x_ctype, case lower(r.module)
        when 'str' then 'Short let' when 'pm' then 'Management' when 'estate' then 'Rent' else null end));
    end if;
    insert into crm_board_items(board_id, group_id, user_id, name, "values", position, crm_deal_id, created_at)
      values (b_tx, case when r.lbl in ('Closed won','Closed lost') then g_comp else g_pend end,
              p_user, coalesce(nullif(r.name,''),'Deal'), jsonb_strip_nulls(v), n, r.id, r.created_at);
  end loop;

  -- Import existing properties (all departments)
  n := 0;
  for r in
    select name, address, bedrooms::numeric, bathrooms::numeric, 'Short let' ct, nullif(image_url,'') img, nightly_rate price, created_at from properties where user_id = p_user
    union all
    select name, concat_ws(', ', nullif(address,''), nullif(city,''), nullif(country,'')), crm_num(bedrooms), crm_num(bathrooms), 'Management', crm_first_url(image_urls), monthly_income, created_at from pm_properties where user_id = p_user
    union all
    select name, address, crm_num(bedrooms), crm_num(bathrooms), 'Rent', crm_first_url(image_urls), rent, created_at from estate_properties where user_id = p_user and pm_property_id is null
  loop
    n := n + 1;
    v := jsonb_build_object(p_ctype::text, crm_board_label_id(p_ctype, r.ct));
    if r.address is not null and r.address <> '' then v := v || jsonb_build_object(p_addr::text, jsonb_build_object('address', r.address)); end if;
    if r.bedrooms is not null then v := v || jsonb_build_object(p_beds::text, r.bedrooms); end if;
    if r.bathrooms is not null then v := v || jsonb_build_object(p_baths::text, r.bathrooms); end if;
    if r.price is not null then v := v || jsonb_build_object(p_price::text, r.price); end if;
    if r.img is not null then v := v || jsonb_build_object(p_media::text, jsonb_build_array(jsonb_build_object('name', 'Photo', 'url', r.img))); end if;
    insert into crm_board_items(board_id, group_id, user_id, name, "values", position, created_at)
      values (b_props, g_port, p_user, coalesce(nullif(r.name,''),'Property'), v, n, r.created_at);
  end loop;
end $$;

-- Storage bucket for CRM files
insert into storage.buckets (id, name, public) values ('crm-files', 'crm-files', true) on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'crm_files_auth_write') then
    create policy crm_files_auth_write on storage.objects for insert to authenticated with check (bucket_id = 'crm-files');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'crm_files_auth_delete') then
    create policy crm_files_auth_delete on storage.objects for delete to authenticated using (bucket_id = 'crm-files' and owner = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'crm_files_public_read') then
    create policy crm_files_public_read on storage.objects for select using (bucket_id = 'crm-files');
  end if;
end $$;

notify pgrst, 'reload schema';

-- Set / clear one cell without overwriting the rest of the row
create or replace function crm_item_set_value(p_item uuid, p_key text, p_value jsonb)
returns jsonb language sql as $$
  update crm_board_items
    set "values" = case when p_value is null or p_value = 'null'::jsonb then "values" - p_key else "values" || jsonb_build_object(p_key, p_value) end,
        updated_at = now()
    where id = p_item
  returning "values"
$$;
grant execute on function crm_item_set_value(uuid, text, jsonb) to authenticated;
grant execute on function crm_seed_default_boards(uuid) to authenticated;
