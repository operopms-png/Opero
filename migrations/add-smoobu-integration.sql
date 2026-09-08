-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Real Smoobu integration. Unlike direct Airbnb/Booking.com API access
-- (needs official partner approval), Smoobu's own API is available to
-- any paid Smoobu account -- and since Smoobu already has its own real
-- connections to Airbnb/Booking.com/etc, this gets Jordan real
-- bookings AND real two-way guest messaging that actually relays into
-- the guest's own Airbnb/Booking.com chat, not just email.

ALTER TABLE integrations
  ADD COLUMN IF NOT EXISTS smoobu_api_key TEXT;

-- Manual mapping -- Smoobu's apartment IDs don't reliably match
-- anything in Opero automatically, so staff pick the right one per
-- property rather than risk a fuzzy name-match linking bookings to
-- the wrong property.
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS smoobu_apartment_id TEXT;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS guest_phone TEXT;

-- bookings.external_id already exists and is uniquely indexed (see
-- add-property-ical-urls.sql) -- reused here for Smoobu bookings too,
-- prefixed 'smoobu-<reservationId>' so it can never collide with an
-- iCal UID from the same or a different property.

ALTER TABLE str_guest_messages
  ADD COLUMN IF NOT EXISTS smoobu_message_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS str_guest_messages_smoobu_id_idx ON str_guest_messages(smoobu_message_id) WHERE smoobu_message_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
