-- Connected mailboxes (Bluehost IMAP/SMTP etc.) and synced messages.
-- RLS is on with NO client policies: everything goes through /api/mailboxes/*
-- which checks the caller's access server-side, so passwords and mail are
-- never readable straight from the browser.
create table if not exists mailboxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  display_name text,
  imap_host text not null default 'mail.sangstersgroup.com',
  imap_port int not null default 993,
  smtp_host text not null default 'mail.sangstersgroup.com',
  smtp_port int not null default 465,
  username text,
  password_enc text,
  status text not null default 'not_connected',
  last_error text,
  last_synced_at timestamptz,
  inbox_uidvalidity bigint,
  inbox_last_uid bigint default 0,
  sent_path text,
  sent_uidvalidity bigint,
  sent_last_uid bigint default 0,
  access text[] not null default '{}',
  use_for_marketing boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, email)
);

create table if not exists mailbox_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  mailbox_id uuid not null references mailboxes(id) on delete cascade,
  folder text not null default 'INBOX',
  uid bigint,
  message_id text,
  in_reply_to text,
  references_ids text,
  from_name text,
  from_email text,
  to_list text,
  cc_list text,
  subject text,
  snippet text,
  body_html text,
  body_text text,
  attachments jsonb not null default '[]',
  date timestamptz,
  seen boolean not null default false,
  created_at timestamptz not null default now()
);
alter table mailbox_messages add constraint mailbox_messages_uid unique (mailbox_id, folder, uid);
create index if not exists mailbox_messages_list on mailbox_messages (mailbox_id, folder, date desc);

alter table mailboxes enable row level security;
alter table mailbox_messages enable row level security;

alter table marketing_emails add column if not exists from_mailbox_id uuid;

-- Give a mailbox to whole teams (team_members.role), and record which staff
-- member sent each email from a shared mailbox.
alter table mailboxes add column if not exists access_teams text[] not null default '{}';
alter table mailbox_messages add column if not exists sent_by text;
