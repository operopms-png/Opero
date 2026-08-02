-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
ALTER TABLE pm_landlord_payments
  ADD COLUMN IF NOT EXISTS receipt_url TEXT;

NOTIFY pgrst, 'reload schema';
