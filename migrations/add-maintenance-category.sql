-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- The owner-portal Maintenance "+ Add Issue" form has a Category field
-- (Plumbing, Electrical, etc.) but maintenance_tickets never had this column.

ALTER TABLE maintenance_tickets
  ADD COLUMN IF NOT EXISTS category TEXT;
