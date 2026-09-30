-- Landlord Reports (PM + EA): per-landlord fee, costs charged to a landlord,
-- sent statements (locked snapshot the landlord sees in their portal), and
-- Estate Agency rent received per month.

alter table pm_landlords add column if not exists management_fee_pct numeric default 10;

create table if not exists landlord_charges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  module text not null check (module in ('pm','ea')),
  landlord_id uuid not null,
  property_id uuid,
  date date not null default current_date,
  category text not null default 'Repair',
  description text,
  amount numeric not null default 0,
  receipt_url text,
  created_at timestamptz not null default now()
);
create index if not exists landlord_charges_landlord on landlord_charges (landlord_id, date);

create table if not exists landlord_statements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  module text not null check (module in ('pm','ea')),
  landlord_id uuid not null,
  period_label text not null,
  period_from date not null,
  period_to date not null,
  balance numeric not null default 0,
  snapshot jsonb not null,
  note text,
  sent_at timestamptz not null default now(),
  sent_by text,
  emailed_to text,
  viewed_at timestamptz
);
create index if not exists landlord_statements_landlord on landlord_statements (landlord_id, period_to desc);

create table if not exists estate_rent_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  tenancy_id uuid not null,
  property_id uuid,
  due_date date not null,
  amount numeric not null default 0,
  paid_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (tenancy_id, due_date)
);

alter table landlord_charges enable row level security;
alter table landlord_statements enable row level security;
alter table estate_rent_receipts enable row level security;

do $$
declare t text;
begin
  foreach t in array array['landlord_charges','landlord_statements','estate_rent_receipts'] loop
    execute format('drop policy if exists "team manages %1$s" on %1$I', t);
    execute format($p$create policy "team manages %1$s" on %1$I for all
      using ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))))
      with check ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))))$p$, t);
  end loop;
end $$;

-- Landlords see (and can mark viewed) only statements sent to them
drop policy if exists "landlord sees own statements" on landlord_statements;
create policy "landlord sees own statements" on landlord_statements for select using (
  (module = 'pm' and landlord_id in (select id from pm_landlords where portal_user_id = auth.uid()))
  or (module = 'ea' and landlord_id in (select id from estate_landlords where portal_user_id = auth.uid()))
);
-- Landlords can only stamp "viewed" on their own statements, nothing else
drop policy if exists "landlord marks own statements viewed" on landlord_statements;
create or replace function mark_landlord_statement_viewed(sid uuid) returns void
language sql security definer set search_path = public as $$
  update landlord_statements set viewed_at = coalesce(viewed_at, now())
  where id = sid and (
    (module = 'pm' and landlord_id in (select id from pm_landlords where portal_user_id = auth.uid()))
    or (module = 'ea' and landlord_id in (select id from estate_landlords where portal_user_id = auth.uid()))
  );
$$;
grant execute on function mark_landlord_statement_viewed(uuid) to authenticated;
