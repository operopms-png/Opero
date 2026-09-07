-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Saved sending addresses -- lets staff pick which real mailbox an
-- email goes out from (e.g. admin@, lettings@, sales@) instead of
-- everything defaulting to notifications@helloopero.com or having to
-- retype an address every time. Shared/reusable across any
-- email-sending feature in the app, not just tenant signing links.

CREATE TABLE IF NOT EXISTS sending_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sending_addresses_user_id ON sending_addresses(user_id);

ALTER TABLE sending_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner manages own sending addresses" ON sending_addresses;
CREATE POLICY "owner manages own sending addresses" ON sending_addresses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
