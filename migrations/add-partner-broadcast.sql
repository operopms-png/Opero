-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Partners → Broadcast: one group chat per business where staff and
-- investor partners post text and pictures (e.g. investment opportunities).
-- business_id = the business owner's auth id.
--   Staff: the business owner, or anyone in team_members for that business.
--   Investors: owners (owner_profiles) whose linked properties belong to
--   that business.

CREATE TABLE IF NOT EXISTS partner_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  author_user_id UUID NOT NULL DEFAULT auth.uid(),
  author_name TEXT,
  author_role TEXT NOT NULL DEFAULT 'staff',   -- staff | investor
  body TEXT,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  is_opportunity BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_broadcasts_business ON partner_broadcasts(business_id, created_at);

ALTER TABLE partner_broadcasts ENABLE ROW LEVEL SECURITY;

-- Who belongs to a business's broadcast
CREATE OR REPLACE FUNCTION is_partner_broadcast_member(biz UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() = biz
    OR EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id = biz AND tm.email = (auth.jwt() ->> 'email'))
    OR EXISTS (
      SELECT 1 FROM owner_profiles o
      JOIN properties p ON p.id = ANY(o.property_ids)
      WHERE o.user_id = auth.uid() AND p.user_id = biz
    )
$$;

CREATE OR REPLACE FUNCTION is_partner_broadcast_staff(biz UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() = biz
    OR EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id = biz AND tm.email = (auth.jwt() ->> 'email'))
$$;

DROP POLICY IF EXISTS "members read broadcast" ON partner_broadcasts;
CREATE POLICY "members read broadcast" ON partner_broadcasts
  FOR SELECT USING (is_partner_broadcast_member(business_id));

DROP POLICY IF EXISTS "members post to broadcast" ON partner_broadcasts;
CREATE POLICY "members post to broadcast" ON partner_broadcasts
  FOR INSERT WITH CHECK (author_user_id = auth.uid() AND is_partner_broadcast_member(business_id));

DROP POLICY IF EXISTS "author or staff delete broadcast" ON partner_broadcasts;
CREATE POLICY "author or staff delete broadcast" ON partner_broadcasts
  FOR DELETE USING (author_user_id = auth.uid() OR is_partner_broadcast_staff(business_id));

-- Live delivery (Supabase Realtime) so posts appear instantly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'partner_broadcasts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE partner_broadcasts;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
