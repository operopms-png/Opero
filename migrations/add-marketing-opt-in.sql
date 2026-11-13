-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- Marketing opt-in on CRM contacts: a real field (not just notes), an unsubscribe token per
-- contact, and when they opted in / out. Bulk marketing sends only go to opted-in contacts.
alter table crm_contacts
  add column if not exists marketing_opt_in boolean not null default false,
  add column if not exists marketing_opt_in_at timestamptz,
  add column if not exists marketing_unsub_at timestamptz,
  add column if not exists unsub_token text;

update crm_contacts set unsub_token = substr(md5(random()::text || id::text), 1, 20) where unsub_token is null;
alter table crm_contacts alter column unsub_token set default substr(md5(random()::text), 1, 20);
create unique index if not exists crm_contacts_unsub_token_idx on crm_contacts(unsub_token);

-- Contacts who already ticked the consent box on the website popup keep their consent.
update crm_contacts set marketing_opt_in = true, marketing_opt_in_at = coalesce(marketing_opt_in_at, created_at)
  where marketing_opt_in = false and marketing_unsub_at is null and notes ilike '%Marketing emails: Yes%';

create index if not exists crm_contacts_opt_in_idx on crm_contacts(user_id) where marketing_opt_in;
notify pgrst, 'reload schema';
