-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- Connects the Checklist tracker to the existing Milestones list instead
-- of being a separate system — a checklist task IS a milestone, just
-- tagged with a phase. Manually added milestones simply have phase = NULL
-- and keep showing up in Milestones exactly as before.

ALTER TABLE dev_milestones
  ADD COLUMN IF NOT EXISTS phase TEXT;

NOTIFY pgrst, 'reload schema';
