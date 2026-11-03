-- Phone assistant: a client's admin links their own mobile so they can message Novourq Cloud AI on WhatsApp.
create table if not exists assistant_phones (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  user_email text not null,
  name text,
  phone text not null,
  code text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists assistant_phones_phone_verified on assistant_phones (phone) where verified;
create index if not exists assistant_phones_business on assistant_phones (business_id);
alter table assistant_phones enable row level security;

create table if not exists assistant_messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  phone text not null,
  role text not null check (role in ('user','assistant')),
  content text not null,
  via text not null default 'text',
  created_at timestamptz not null default now()
);
create index if not exists assistant_messages_phone on assistant_messages (phone, created_at desc);
alter table assistant_messages enable row level security;
