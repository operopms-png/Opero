-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- Run AFTER add-partners-agent-programme.sql and add-partner-broadcast.sql.
--
-- Partner access control.
-- Investor partners sign in to Staff Centre → Partners only. An admin can
-- grant more (modules / Staff Centre tabs); that list is stored here.
-- A partner given extra access also gets a team_members row with
-- role 'Partner' so the granted pages load the business's data — those
-- rows must never count as staff for partner-only data (agents, referrals,
-- broadcast moderation).

ALTER TABLE owner_profiles ADD COLUMN IF NOT EXISTS custom_modules TEXT[];

-- Broadcast moderation: real staff only, never partners
CREATE OR REPLACE FUNCTION is_partner_broadcast_staff(biz UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() = biz
    OR EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = biz AND tm.email = (auth.jwt() ->> 'email') AND COALESCE(tm.role, '') <> 'Partner'
    )
$$;

-- Agent Programme: staff only, never partners
DROP POLICY IF EXISTS "business manages partner agents" ON partner_agents;
CREATE POLICY "business manages partner agents" ON partner_agents
  FOR ALL
  USING (auth.uid() = user_id OR is_partner_broadcast_staff(user_id))
  WITH CHECK (auth.uid() = user_id OR is_partner_broadcast_staff(user_id));

DROP POLICY IF EXISTS "business manages agent referrals" ON agent_referrals;
CREATE POLICY "business manages agent referrals" ON agent_referrals
  FOR ALL
  USING (auth.uid() = user_id OR is_partner_broadcast_staff(user_id))
  WITH CHECK (auth.uid() = user_id OR is_partner_broadcast_staff(user_id));

NOTIFY pgrst, 'reload schema';
