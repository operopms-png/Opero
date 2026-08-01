-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke — "opero pms")
-- The Banking Details form on Contact & Payment was completely disconnected
-- from its save function this whole time (inputs used defaultValue with no
-- onChange, so Save Banking Info always saved an empty object). Now that
-- it's fixed and will actually send real data, make sure every column it
-- writes to actually exists — same class of "column doesn't exist" surprise
-- found repeatedly elsewhere this session.

ALTER TABLE owner_contact
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS account_name TEXT,
  ADD COLUMN IF NOT EXISTS account_number TEXT,
  ADD COLUMN IF NOT EXISTS sort_code TEXT,
  ADD COLUMN IF NOT EXISTS routing_number TEXT,
  ADD COLUMN IF NOT EXISTS payout_schedule TEXT DEFAULT 'Monthly';

NOTIFY pgrst, 'reload schema';
