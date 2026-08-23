-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Same bug found and fixed in Estate Agency
-- (add-estate-tenant-unit-maintenance-parity.sql): pm_maintenance and
-- pm_cleaning_tasks both have assigned_to typed as UUID, but both forms
-- collect a plain contractor/cleaner NAME (see app/pm/page.tsx --
-- "Contractor name" / "Cleaner name" placeholders). Typing a name in
-- fails with "invalid input syntax for type uuid" -- confirmed live.

ALTER TABLE pm_maintenance
  ALTER COLUMN assigned_to TYPE TEXT USING assigned_to::text;

ALTER TABLE pm_cleaning_tasks
  ALTER COLUMN assigned_to TYPE TEXT USING assigned_to::text;

NOTIFY pgrst, 'reload schema';
