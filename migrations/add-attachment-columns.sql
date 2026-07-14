-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- Lets Messages and Maintenance issues carry an attached photo/video URL.

ALTER TABLE owner_messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT;

ALTER TABLE maintenance_tickets
  ADD COLUMN IF NOT EXISTS attachment_url TEXT;
