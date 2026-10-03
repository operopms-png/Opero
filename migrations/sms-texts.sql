-- Texts (SMS) in the portal via Twilio. One row per Twilio number; messages in
-- sms_messages (sender 'contact' = incoming, otherwise the staff member's name).
-- Read/written only through /api/sms/* with the service role.
create table if not exists public.sms_connections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  label text not null default 'Texts',
  phone text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists sms_connections_phone_idx on public.sms_connections (phone);
alter table public.sms_connections enable row level security;

alter table public.sms_messages add column if not exists business_id uuid;
alter table public.sms_messages add column if not exists read_at timestamptz;
alter table public.sms_messages add column if not exists status text;
alter table public.sms_messages add column if not exists sent_by text;
create index if not exists sms_messages_conv_idx on public.sms_messages (connection_id, contact_phone, created_at desc);
alter table public.sms_messages enable row level security;
