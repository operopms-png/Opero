-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Same bug as fix-marketing-email-reply-token-length.sql, but more
-- serious here: app/api/crm-send builds reply_to as
-- crm+<user_id_uuid>.<contact_id_uuid>@helloopero.com whenever a
-- contact_id is present -- 77+ characters, over the 64-character limit
-- Resend enforces on the local part. Unlike a reply merely failing to
-- route, Resend REJECTS THE WHOLE SEND when reply_to is invalid, so
-- every CRM email sent to a specific contact has likely been failing
-- outright, not just failing to receive replies.
--
-- Sends with no contact_id (crm+<user_id>@helloopero.com, ~40 chars)
-- were fine -- this only affects contact-linked sends, which is most
-- of them.

ALTER TABLE crm_contacts
  ADD COLUMN IF NOT EXISTS reply_token TEXT;

UPDATE crm_contacts SET reply_token = substr(md5(random()::text || id::text), 1, 12) WHERE reply_token IS NULL;

ALTER TABLE crm_contacts
  ALTER COLUMN reply_token SET DEFAULT substr(md5(random()::text), 1, 12);

CREATE UNIQUE INDEX IF NOT EXISTS crm_contacts_reply_token_idx ON crm_contacts(reply_token);

NOTIFY pgrst, 'reload schema';
