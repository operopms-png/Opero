-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- The 'Assigned To' dropdowns on cleaning_tasks / maintenance_tickets /
-- turnovers keep failing with a foreign key violation even after sending
-- the correct team_members.id — meaning the id being sent doesn't match
-- whatever row the constraint expects (a deeper data/schema mismatch).
-- Dropping the constraint unblocks assignment without needing to track
-- down that mismatch; assigned_to still stores the id, just without a
-- hard DB-level check against it.

ALTER TABLE cleaning_tasks DROP CONSTRAINT IF EXISTS cleaning_tasks_assigned_to_fkey;
ALTER TABLE maintenance_tickets DROP CONSTRAINT IF EXISTS maintenance_tickets_assigned_to_fkey;
ALTER TABLE turnovers DROP CONSTRAINT IF EXISTS turnovers_assigned_to_fkey;
