-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- team_members never had a status column, despite /api/invite (and the
-- Team Management UI) assuming it did — 'Could not find the status
-- column' when sending an invite.

ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

NOTIFY pgrst, 'reload schema';
