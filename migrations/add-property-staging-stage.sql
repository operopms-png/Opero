-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- Tracks each property's progress through the onboarding pipeline:
-- 0 = not started, 10 = live on all booking platforms.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS staging_stage INTEGER DEFAULT 0;
