-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- Lets a team member be restricted to specific properties, not just a
-- role. NULL/empty means "all properties" (current behavior unchanged
-- until you actually assign something).

ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS property_ids UUID[] DEFAULT '{}';

NOTIFY pgrst, 'reload schema';
