-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Lets each account choose what "From" address their marketing emails
-- send as, instead of the hardcoded notifications@helloopero.com.
-- Reuses the integrations table since it's already the per-account
-- settings row (pricelabs_api_key, xero_*, etc).

ALTER TABLE integrations
  ADD COLUMN IF NOT EXISTS marketing_from_email TEXT,
  ADD COLUMN IF NOT EXISTS marketing_from_name TEXT;

NOTIFY pgrst, 'reload schema';
