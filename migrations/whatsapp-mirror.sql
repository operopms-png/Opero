-- WhatsApp mirror: Staff Centre → Human Intelligence Hub → Clients and sales → WhatsApp.
-- One bridge per company (the small service that holds the linked WhatsApp number) and a copy of every private message in and out.
create table if not exists wa_bridges (
  business_id uuid primary key,
  bridge_url text not null default '',
  secret text not null unique default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table wa_bridges enable row level security;

create table if not exists wa_messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  wa_id text,
  jid text not null,
  phone text,
  name text,
  from_me boolean not null default false,
  body text not null,
  sent_by text,
  at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (business_id, wa_id)
);
alter table wa_messages enable row level security;
create index if not exists wa_messages_chat on wa_messages(business_id, jid, at desc);
create index if not exists wa_messages_recent on wa_messages(business_id, at desc);
