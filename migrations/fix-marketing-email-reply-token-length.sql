-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- The reply-to address was being built as
-- marketing+<user_id_uuid>.<email_id_uuid>@helloopero.com -- two full
-- UUIDs is 73+ characters before the @, and email addresses have a hard
-- 64-character limit on that part (RFC 5321). Resend's validator
-- enforces it, so every send failed with "Invalid reply_to field."
--
-- Fix: a single short random token per email instead of encoding both
-- IDs directly. The inbound webhook looks the token up to find the row
-- (and its user_id) rather than parsing IDs out of the address.

ALTER TABLE marketing_emails
  ADD COLUMN IF NOT EXISTS reply_token TEXT;

UPDATE marketing_emails SET reply_token = substr(md5(random()::text || id::text), 1, 12) WHERE reply_token IS NULL;

ALTER TABLE marketing_emails
  ALTER COLUMN reply_token SET DEFAULT substr(md5(random()::text), 1, 12);

CREATE UNIQUE INDEX IF NOT EXISTS marketing_emails_reply_token_idx ON marketing_emails(reply_token);

NOTIFY pgrst, 'reload schema';
