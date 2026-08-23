-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Part of bringing Estate Agency forms to exact parity with Property
-- Management. Three real gaps found:
--
-- 1. estate_tenants had no unit_id link at all -- Unit was a free-text
--    field (unit_label), while PM ties a tenant to a real pm_units row.
--
-- 2. estate_maintenance.assigned_to and estate_cleaning_tasks.assigned_to
--    are typed UUID, but both forms actually collect a plain contractor/
--    cleaner NAME (matching PM's pattern, which is free text). Typing a
--    name into "Assigned To" on EA's Cleaning tab would currently fail
--    to save -- a real, live bug this uncovered, not just a UI mismatch.
--
-- 3. estate_maintenance had no column for the Photo/Document upload
--    PM's Maintenance modal has.

ALTER TABLE estate_tenants
  ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES estate_units(id) ON DELETE SET NULL;

ALTER TABLE estate_maintenance
  ALTER COLUMN assigned_to TYPE TEXT USING assigned_to::text;

ALTER TABLE estate_cleaning_tasks
  ALTER COLUMN assigned_to TYPE TEXT USING assigned_to::text,
  ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES estate_units(id) ON DELETE SET NULL;

ALTER TABLE estate_maintenance
  ADD COLUMN IF NOT EXISTS photos JSONB;

NOTIFY pgrst, 'reload schema';
