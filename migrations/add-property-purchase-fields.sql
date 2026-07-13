-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- Adds the columns the owner-portal "My Properties" edit card needs —
-- these never existed on the properties table, which is why saving
-- purchase price / down payment / platform failed with a schema error.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS purchase_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS down_payment NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'Wire Transfer';
