-- WhatsApp Business in the Inbox through Meta's WhatsApp Cloud API (no Twilio).
-- Each company connects its own number. whatsapp_connections / whatsapp_messages already
-- exist (empty, Twilio-shaped); this adds the Meta columns and a per-chat hand-over table.
-- Read/written only through /api/whatsapp/* with the service role. Safe to run twice.

alter table public.whatsapp_connections alter column twilio_account_sid drop not null;
alter table public.whatsapp_connections alter column twilio_auth_token drop not null;
alter table public.whatsapp_connections add column if not exists provider text not null default 'meta';
alter table public.whatsapp_connections add column if not exists phone_number_id text;
alter table public.whatsapp_connections add column if not exists waba_id text;
alter table public.whatsapp_connections add column if not exists access_token_enc text;
alter table public.whatsapp_connections add column if not exists verified_name text;
alter table public.whatsapp_connections add column if not exists quality text;
-- When the AI answers: 'always' or 'out_of_hours' (uses the receptionist's opening hours).
-- Switch it on with the existing ai_receptionist_enabled flag.
alter table public.whatsapp_connections add column if not exists ai_when text not null default 'always';
create unique index if not exists whatsapp_connections_phone_number_id_idx on public.whatsapp_connections (phone_number_id) where phone_number_id is not null;
alter table public.whatsapp_connections enable row level security;

-- sender: 'contact' = incoming, 'ai' = Novourq Cloud AI, otherwise the staff member's name.
alter table public.whatsapp_messages add column if not exists business_id uuid;
alter table public.whatsapp_messages add column if not exists wamid text;
alter table public.whatsapp_messages add column if not exists status text;
alter table public.whatsapp_messages add column if not exists read_at timestamptz;
alter table public.whatsapp_messages add column if not exists template_name text;
create unique index if not exists whatsapp_messages_wamid_idx on public.whatsapp_messages (wamid) where wamid is not null;
create index if not exists whatsapp_messages_conv_idx on public.whatsapp_messages (connection_id, contact_phone, created_at desc);
alter table public.whatsapp_messages enable row level security;

-- One row per chat that has been handed to a person (or paused). While ai_paused is true the AI stays silent.
create table if not exists public.whatsapp_threads (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.whatsapp_connections(id) on delete cascade,
  business_id uuid not null,
  contact_phone text not null,
  ai_paused boolean not null default false,
  paused_reason text,
  paused_by text,
  paused_at timestamptz,
  ai_draft text,
  updated_at timestamptz not null default now(),
  unique (connection_id, contact_phone)
);
alter table public.whatsapp_threads enable row level security;
