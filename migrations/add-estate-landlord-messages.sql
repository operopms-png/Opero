-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Estate Agency was the only portal with no landlord messaging at
-- all -- estate-owner-portal explicitly had a comment saying it
-- wasn't built. Mirrors pm_landlord_messages exactly (same sender
-- check, same RLS pattern via portal_user_id).

CREATE TABLE IF NOT EXISTS estate_landlord_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL REFERENCES estate_landlords(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('staff','landlord')),
  message TEXT NOT NULL DEFAULT '',
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE estate_landlord_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "landlord or owning staff can read estate messages" ON estate_landlord_messages;
CREATE POLICY "landlord or owning staff can read estate messages"
ON estate_landlord_messages
FOR SELECT
USING (
  landlord_id IN (SELECT id FROM estate_landlords WHERE portal_user_id = auth.uid())
  OR
  landlord_id IN (SELECT id FROM estate_landlords WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "landlord can send own estate messages" ON estate_landlord_messages;
CREATE POLICY "landlord can send own estate messages"
ON estate_landlord_messages
FOR INSERT
WITH CHECK (
  sender = 'landlord'
  AND landlord_id IN (SELECT id FROM estate_landlords WHERE portal_user_id = auth.uid())
);

-- Staff sends go through a service-role API route (send-estate-landlord-message),
-- which bypasses RLS by design -- same pattern as every other messaging
-- channel in this app.

NOTIFY pgrst, 'reload schema';
