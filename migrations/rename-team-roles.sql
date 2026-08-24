-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Renames existing team_members.role values to match the new role
-- names in lib/useRole.ts. The app also recognizes the old names as a
-- safety net (LEGACY_ROLE_ALIASES), but this is the real, permanent
-- fix so the data itself matches what's shown in Team Management.

UPDATE team_members SET role = 'Vacation Rental Team'     WHERE role = 'Airbnb Agent';
UPDATE team_members SET role = 'Property Management Team' WHERE role = 'Property Manager';
UPDATE team_members SET role = 'Development Team'         WHERE role = 'Dev';
UPDATE team_members SET role = 'Cleaning Team'             WHERE role = 'Cleaner';
UPDATE team_members SET role = 'Maintenance Team'         WHERE role = 'Maintenance';
UPDATE team_members SET role = 'Estate Agency Team'       WHERE role = 'Estate Agent';

NOTIFY pgrst, 'reload schema';
