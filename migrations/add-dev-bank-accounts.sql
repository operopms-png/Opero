-- Developments bank accounts are now saved (they used to live only in the browser).
create table if not exists public.dev_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  type text default 'Current',
  balance numeric default 0,
  currency text default 'GBP',
  created_at timestamptz not null default now()
);
alter table public.dev_bank_accounts enable row level security;
create policy "owner manages own dev bank accounts" on public.dev_bank_accounts for all
  using ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'::text))))
  with check ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'::text))));
