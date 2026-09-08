-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Real guest messaging, since guests don't have a portal login the
-- way landlords/tenants do -- they message through Airbnb/Booking.com's
-- own apps normally, which Opero can't intercept without official
-- platform partner API access (same limitation as channel management
-- itself). What IS achievable without that: real email to/from the
-- guest's own email address, using the exact same reply_token +
-- plus-alias pattern already working for CRM
-- (migrations/fix-crm-reply-token-length.sql) and marketing emails.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS reply_token TEXT;

UPDATE bookings SET reply_token = substr(md5(random()::text || id::text), 1, 12) WHERE reply_token IS NULL;

ALTER TABLE bookings
  ALTER COLUMN reply_token SET DEFAULT substr(md5(random()::text), 1, 12);

CREATE UNIQUE INDEX IF NOT EXISTS bookings_reply_token_idx ON bookings(reply_token);

CREATE TABLE IF NOT EXISTS str_guest_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE str_guest_messages ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL;
ALTER TABLE str_guest_messages ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE;
ALTER TABLE str_guest_messages ADD COLUMN IF NOT EXISTS sender TEXT NOT NULL DEFAULT 'staff' CHECK (sender IN ('staff','guest'));
ALTER TABLE str_guest_messages ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE str_guest_messages ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT '';
ALTER TABLE str_guest_messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_str_guest_messages_booking_id ON str_guest_messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_str_guest_messages_user_id ON str_guest_messages(user_id);

ALTER TABLE str_guest_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner manages own str guest messages" ON str_guest_messages;
CREATE POLICY "owner manages own str guest messages" ON str_guest_messages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
