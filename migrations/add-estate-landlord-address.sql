-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
ALTER TABLE estate_landlords
  ADD COLUMN IF NOT EXISTS address TEXT;

NOTIFY pgrst, 'reload schema';
