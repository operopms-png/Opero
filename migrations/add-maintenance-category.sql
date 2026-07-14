-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- The owner-portal Maintenance "+ Add Issue" form has a Category field
-- (Plumbing, Electrical, etc.) but maintenance_tickets never had this column.
-- It also never had a 'title' column, despite multiple forms across the app
-- (STR page, owner-portal) assuming it did — always silently failing on
-- insert until now.

ALTER TABLE maintenance_tickets
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT;
