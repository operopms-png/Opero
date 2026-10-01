-- Airbnb Inbox: Reply-To of synced emails (Airbnb replies post through it)
-- and per-thread state (open/done, read, CRM link).
alter table public.mailbox_messages add column if not exists reply_to text;
create table if not exists public.airbnb_threads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  thread_key text not null,
  status text not null default 'open',
  read_at timestamptz,
  crm_contact_id uuid,
  updated_at timestamptz default now(),
  unique (business_id, thread_key)
);
alter table public.airbnb_threads enable row level security;
create index if not exists mailbox_messages_from_email_idx on public.mailbox_messages (mailbox_id, from_email);
