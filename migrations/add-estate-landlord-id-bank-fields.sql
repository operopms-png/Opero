-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Brings estate_landlords to field parity with pm_landlords: ID
-- verification and international bank details that EA's Landlords form
-- was missing.

ALTER TABLE estate_landlords
  ADD COLUMN IF NOT EXISTS id_type TEXT,
  ADD COLUMN IF NOT EXISTS id_url TEXT,
  ADD COLUMN IF NOT EXISTS iban TEXT,
  ADD COLUMN IF NOT EXISTS swift TEXT;

NOTIFY pgrst, 'reload schema';
