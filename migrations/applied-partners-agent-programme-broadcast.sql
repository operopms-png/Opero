-- Already applied to project mzjsxrlgnthelwwtfkke (kept for the record).
-- Final applied version of the Agent Programme + Partners Broadcast tables.
-- Supersedes add-partners-agent-programme.sql, add-partner-broadcast.sql and
-- add-partner-access.sql (do not run those — this is what's live).
-- Uses is_owner_staff() from fix-owner-tables-rls.sql: business owner + team,
-- never 'Partner' rows.

CREATE TABLE IF NOT EXISTS partner_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  country TEXT,
  code TEXT NOT NULL,
  st_rate_type TEXT NOT NULL DEFAULT 'percent',
  st_rate NUMERIC NOT NULL DEFAULT 10,
  lt_rate_type TEXT NOT NULL DEFAULT 'percent',
  lt_rate NUMERIC NOT NULL DEFAULT 50,
  payout_method TEXT,
  payout_details TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  portal_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE partner_agents ADD COLUMN IF NOT EXISTS portal_user_id UUID;
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_agents_code ON partner_agents(user_id, code);
CREATE INDEX IF NOT EXISTS idx_partner_agents_user_id ON partner_agents(user_id);

CREATE TABLE IF NOT EXISTS agent_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_id UUID NOT NULL REFERENCES partner_agents(id) ON DELETE CASCADE,
  referral_type TEXT NOT NULL,
  channel TEXT,
  person_name TEXT NOT NULL,
  person_email TEXT,
  person_phone TEXT,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  property_label TEXT,
  start_date DATE,
  end_date DATE,
  value NUMERIC,
  status TEXT NOT NULL DEFAULT 'logged',
  screening_notes TEXT,
  commission_amount NUMERIC,
  commission_status TEXT NOT NULL DEFAULT 'none',
  paid_at TIMESTAMPTZ,
  payout_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_referrals_user_id ON agent_referrals(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_referrals_agent_id ON agent_referrals(agent_id);

ALTER TABLE partner_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "business manages partner agents" ON partner_agents;
CREATE POLICY "business manages partner agents" ON partner_agents FOR ALL
  USING (is_owner_staff(user_id)) WITH CHECK (is_owner_staff(user_id));
DROP POLICY IF EXISTS "business manages agent referrals" ON agent_referrals;
CREATE POLICY "business manages agent referrals" ON agent_referrals FOR ALL
  USING (is_owner_staff(user_id)) WITH CHECK (is_owner_staff(user_id));

CREATE TABLE IF NOT EXISTS partner_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  author_user_id UUID NOT NULL DEFAULT auth.uid(),
  author_name TEXT,
  author_role TEXT NOT NULL DEFAULT 'staff',
  body TEXT,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  is_opportunity BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partner_broadcasts_business ON partner_broadcasts(business_id, created_at);
ALTER TABLE partner_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_partner_broadcast_staff(biz UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT is_owner_staff(biz) $$;

CREATE OR REPLACE FUNCTION is_partner_broadcast_member(biz UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    is_owner_staff(biz)
    OR EXISTS (SELECT 1 FROM owner_profiles o WHERE o.user_id = auth.uid() AND o.business_id = biz)
    OR EXISTS (SELECT 1 FROM partner_agents a WHERE a.portal_user_id = auth.uid() AND a.user_id = biz AND a.status = 'active')
$$;

DROP POLICY IF EXISTS "members read broadcast" ON partner_broadcasts;
CREATE POLICY "members read broadcast" ON partner_broadcasts FOR SELECT
  USING (is_partner_broadcast_member(business_id));
DROP POLICY IF EXISTS "members post to broadcast" ON partner_broadcasts;
CREATE POLICY "members post to broadcast" ON partner_broadcasts FOR INSERT
  WITH CHECK (author_user_id = auth.uid() AND is_partner_broadcast_member(business_id));
DROP POLICY IF EXISTS "author or staff delete broadcast" ON partner_broadcasts;
CREATE POLICY "author or staff delete broadcast" ON partner_broadcasts FOR DELETE
  USING (author_user_id = auth.uid() OR is_partner_broadcast_staff(business_id));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'partner_broadcasts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE partner_broadcasts;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
