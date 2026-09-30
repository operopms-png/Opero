-- AI Receptionist: one settings row per business (shared knowledge, hours,
-- per-channel modes), an activity log of everything it handled, live phone
-- call sessions, and AI fields on synced emails.
create table if not exists ai_receptionist_settings (
  business_id uuid primary key,
  assistant_name text not null default 'Sangsters Assistant',
  company_name text default 'Sangsters',
  knowledge text,
  sync_website_chat boolean not null default true,
  timezone text not null default 'Europe/London',
  hours jsonb not null default '{"mon":["09:00","17:30"],"tue":["09:00","17:30"],"wed":["09:00","17:30"],"thu":["09:00","17:30"],"fri":["09:00","17:30"],"sat":null,"sun":null}',
  alert_email text,
  portal_mode text not null default 'off',          -- off | always | out_of_hours
  portal_create_maintenance boolean not null default true,
  phone_mode text not null default 'off',           -- off | always | no_answer | out_of_hours
  phone_greeting text,
  phone_voice text not null default 'Polly.Amy-Neural',
  phone_transfer_number text,
  phone_ring_seconds int not null default 20,
  updated_at timestamptz not null default now()
);

create table if not exists ai_receptionist_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  channel text not null,        -- phone | email | portal | website
  source_key text,              -- id of the message/call handled (dedupe)
  contact_name text,
  contact text,
  subject text,
  summary text,
  action text,                  -- replied | drafted | message_taken | transferred | maintenance_created | viewing_requested | escalated | skipped
  needs_staff boolean not null default false,
  resolved boolean not null default false,
  link text,
  details jsonb,
  created_at timestamptz not null default now(),
  unique (channel, source_key)
);
create index if not exists ai_receptionist_log_biz on ai_receptionist_log (business_id, created_at desc);

create table if not exists ai_call_sessions (
  call_sid text primary key,
  business_id uuid not null,
  caller text,
  turns jsonb not null default '[]',
  outcome jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table mailboxes add column if not exists ai_mode text not null default 'off'; -- off | draft | auto
alter table mailbox_messages add column if not exists ai_draft text;
alter table mailbox_messages add column if not exists ai_category text;
alter table mailbox_messages add column if not exists ai_status text;  -- drafted | replied | skipped
alter table mailbox_messages add column if not exists is_bulk boolean not null default false;

alter table ai_receptionist_settings enable row level security;
alter table ai_receptionist_log enable row level security;
alter table ai_call_sessions enable row level security;

drop policy if exists "team reads receptionist settings" on ai_receptionist_settings;
create policy "team reads receptionist settings" on ai_receptionist_settings for select using (business_id = auth.uid() or business_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email')));
drop policy if exists "admins edit receptionist settings" on ai_receptionist_settings;
create policy "admins edit receptionist settings" on ai_receptionist_settings for all using (business_id = auth.uid() or business_id in (select my_admin_business_ids())) with check (business_id = auth.uid() or business_id in (select my_admin_business_ids()));
drop policy if exists "team manages receptionist log" on ai_receptionist_log;
create policy "team manages receptionist log" on ai_receptionist_log for all using (business_id = auth.uid() or business_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))) with check (business_id = auth.uid() or business_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email')));
-- ai_call_sessions: server only (no client policies)
