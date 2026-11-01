-- Rent reminders: drafted text messages for upcoming and late rent, held until a
-- person approves them (Staff Centre → Finance → Reminders). Nothing is texted to a
-- tenant until an admin or co-founder approves it. Read/written only through
-- /api/finance/reminders with the service role.
create table if not exists public.rent_reminders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  module text not null,
  rent_ref text not null,
  stage text not null,
  tenant text,
  phone text,
  property text,
  amount numeric,
  currency text,
  due_date date,
  message text not null,
  status text not null default 'pending',
  drafted_by text,
  decided_by text,
  decided_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);
create unique index if not exists rent_reminders_unique_idx on public.rent_reminders (business_id, rent_ref, stage);
create index if not exists rent_reminders_status_idx on public.rent_reminders (business_id, status, created_at desc);
alter table public.rent_reminders enable row level security;
notify pgrst, 'reload schema';
