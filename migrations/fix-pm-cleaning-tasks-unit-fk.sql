-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- pm_cleaning_tasks.unit_id was created as a bare UUID with no foreign
-- key to pm_units. app/pm/page.tsx's loadAll() selects
-- '*,pm_properties(name),pm_units(unit_number)' -- that embedded
-- pm_units(...) join requires a real FK relationship in the schema
-- cache, or PostgREST rejects the whole query with an error.
--
-- Net effect: cleaning tasks were saving to the database just fine,
-- but the list query that's supposed to display them was failing
-- silently (loadAll never checks the Promise.all error results), so
-- the Cleaning tab always showed "No cleaning tasks scheduled" no
-- matter how many tasks actually existed.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pm_cleaning_tasks_unit_id_fkey'
  ) THEN
    ALTER TABLE pm_cleaning_tasks
      ADD CONSTRAINT pm_cleaning_tasks_unit_id_fkey
      FOREIGN KEY (unit_id) REFERENCES pm_units(id) ON DELETE SET NULL;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
