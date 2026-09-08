-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Fixes a real, fully broken feature: the Integrations tab's Airbnb/
-- VRBO/Booking.com iCal cards saved the pasted URL to the
-- `integrations` table (one shared URL for the whole account,
-- regardless of how many properties exist), while the actual sync
-- job (app/api/sync-ical) reads iCal URLs from `properties` --
-- columns that never existed and were never populated. The feature
-- has never worked for anyone, on any account.
--
-- Each property needs its OWN iCal URL (every Airbnb/VRBO/Booking.com
-- listing has its own distinct calendar export link), so these belong
-- on properties, not integrations.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS airbnb_ical_url TEXT,
  ADD COLUMN IF NOT EXISTS vrbo_ical_url TEXT,
  ADD COLUMN IF NOT EXISTS booking_ical_url TEXT;

-- bookings.external_id/platform/source didn't exist either, and the
-- sync job's upsert(...,{onConflict:'external_id'}) needs a real
-- unique constraint on that column to work at all -- ON CONFLICT
-- fails outright without one. Partial index (only for rows that
-- actually have an external_id) since normal UI-created bookings
-- won't have one.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_external_id_idx ON bookings(external_id) WHERE external_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
