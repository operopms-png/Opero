-- Drafts, Archive, Spam and Trash folders alongside Inbox and Sent: where each lives on the mail server and how far we have synced.
alter table mailboxes add column if not exists folder_state jsonb not null default '{}'::jsonb;
