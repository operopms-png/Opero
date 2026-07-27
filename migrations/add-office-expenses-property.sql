-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- Lets an office expense optionally be tagged to a specific property/
-- project (e.g. "Trinity Heights", "Porus Office") instead of just a
-- generic category like "Property". Free text so it works the same
-- way across Developments, PM, Estate Agency, and STR, whatever each
-- module calls its properties/projects.

ALTER TABLE office_expenses
  ADD COLUMN IF NOT EXISTS property_name TEXT;

NOTIFY pgrst, 'reload schema';
