-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Some staff need a mix of modules that doesn't match any single role
-- (e.g. a Property Manager who also needs Vacation Rentals, Estate
-- Agency, and the Deal Analyser). custom_modules, when set, overrides
-- that person's role-default module list entirely -- NULL/empty means
-- "just use whatever their role normally grants," so this is opt-in
-- per person, not a new role to maintain.

ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS custom_modules TEXT[];

NOTIFY pgrst, 'reload schema';
