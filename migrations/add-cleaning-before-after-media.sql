-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- Lets a cleaning task carry before/after photos or videos.
-- Stored as JSON-encoded arrays of URLs (text column), same pattern
-- used for owner_messages.attachment_url and maintenance_tickets.

ALTER TABLE cleaning_tasks
  ADD COLUMN IF NOT EXISTS before_media TEXT,
  ADD COLUMN IF NOT EXISTS after_media TEXT;

NOTIFY pgrst, 'reload schema';
