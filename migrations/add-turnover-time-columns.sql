-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- The Schedule Turnover form has Check-out Time / Check-in Time fields,
-- but the turnovers table never had these columns.

ALTER TABLE turnovers
  ADD COLUMN IF NOT EXISTS check_out_time TIME,
  ADD COLUMN IF NOT EXISTS check_in_time TIME;
