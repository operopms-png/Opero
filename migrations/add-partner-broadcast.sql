-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Partners → Broadcast: one group chat per business where staff and
-- partners post text and pictures (e.g. investment opportunities).
-- business_id = the business owner's auth id.
-- Members:
--   Staff    — the business owner, or anyone in team_members for that business
--   Investors — every owner_profiles account created by that business
--   Agents   — partner_agents with a login (portal_user_id), for when agent logins go live
-- Tenants and landlords (pm_/estate_ portals) are never members.

-- Every investor belongs to the business that created them
ALTER TABLE owner_profiles ADD COLUMN IF NOT EXISTS business_id UUID;
CREATE INDEX IF NOT EXISTS idx_owner_profiles_business_id ON owner_profiles(business_id);

-- Backfill existing investors from the properties they're linked to
UPDATE owner_profiles o
SET business_id = (SELECT p.user_id FROM properties p WHERE p.id = ANY(o.property_ids) LIMIT 1)
WHERE o.business_id IS NULL AND COALESCE(array_length(o.property_ids, 1), 0) > 0;

-- Keep it filled if an older investor without one is later given a property
CREATE OR REPLACE FUNCTION owner_profiles_fill_business_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.business_id IS NULL AND COALESCE(array_length(NEW.property_ids, 1), 0) > 0 THEN
    SELECT p.user_id INTO NEW.business_id FROM properties p WHERE p.id = ANY(NEW.property_ids) LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_owner_profiles_fill_business_id ON owner_profiles;
CREATE TRIGGER trg_owner_profiles_fill_business_id
  BEFORE INSERT OR UPDATE OF property_ids ON owner_profiles
  FOR EACH ROW EXECUTE FUNCTION owner_profiles_fill_business_id();

-- Agent logins (not live yet) — links an agent to their own auth account
ALTER TABLE partner_agents ADD COLUMN IF NOT EXISTS portal_user_id UUID;

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
    OR EXISTS (SELECT 1 FROM owner_profiles o WHERE o.user_id = auth.uid() AND o.business_id = biz)
    OR EXISTS (SELECT 1 FROM partner_agents a WHERE a.portal_user_id = auth.uid() AND a.user_id = biz AND a.status = 'active')
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
