-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Partners → Agent Programme.
-- partner_agents: commission agents who introduce guests (short-term) or
-- tenants (long-term). agent_referrals: every guest/tenant an agent logs,
-- its screening status and the commission owed on it.
-- Scoped to the business (user_id = business owner's auth id); the owner
-- and their staff (team_members) can manage both tables.

CREATE TABLE IF NOT EXISTS partner_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  country TEXT,
  code TEXT NOT NULL,
  st_rate_type TEXT NOT NULL DEFAULT 'percent', -- percent | flat
  st_rate NUMERIC NOT NULL DEFAULT 10,
  lt_rate_type TEXT NOT NULL DEFAULT 'percent', -- percent | flat
  lt_rate NUMERIC NOT NULL DEFAULT 50,          -- % of one month's rent
  payout_method TEXT,                            -- stripe | bank | wise | other
  payout_details TEXT,
  status TEXT NOT NULL DEFAULT 'active',         -- active | paused
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_agents_code ON partner_agents(user_id, code);
CREATE INDEX IF NOT EXISTS idx_partner_agents_user_id ON partner_agents(user_id);

CREATE TABLE IF NOT EXISTS agent_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_id UUID NOT NULL REFERENCES partner_agents(id) ON DELETE CASCADE,
  referral_type TEXT NOT NULL,                   -- short_term | long_term
  channel TEXT,                                  -- direct | airbnb | booking_com | other (short-term)
  person_name TEXT NOT NULL,
  person_email TEXT,
  person_phone TEXT,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  property_label TEXT,
  start_date DATE,                               -- check-in / move-in
  end_date DATE,                                 -- check-out (short-term)
  value NUMERIC,                                 -- booking value (ST) or monthly rent (LT)
  status TEXT NOT NULL DEFAULT 'logged',         -- logged | screening | approved | rejected | completed | cancelled
  screening_notes TEXT,
  commission_amount NUMERIC,
  commission_status TEXT NOT NULL DEFAULT 'none',-- none | pending | payable | paid | clawed_back
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
CREATE POLICY "business manages partner agents" ON partner_agents
  FOR ALL
  USING (auth.uid() = user_id OR user_id IN (SELECT user_id FROM team_members WHERE email = (auth.jwt() ->> 'email')))
  WITH CHECK (auth.uid() = user_id OR user_id IN (SELECT user_id FROM team_members WHERE email = (auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "business manages agent referrals" ON agent_referrals;
CREATE POLICY "business manages agent referrals" ON agent_referrals
  FOR ALL
  USING (auth.uid() = user_id OR user_id IN (SELECT user_id FROM team_members WHERE email = (auth.jwt() ->> 'email')))
  WITH CHECK (auth.uid() = user_id OR user_id IN (SELECT user_id FROM team_members WHERE email = (auth.jwt() ->> 'email')));

NOTIFY pgrst, 'reload schema';
