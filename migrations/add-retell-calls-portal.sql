-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- AI Call Line: lets each company see only its own Nova (Retell) voice agent
-- calls, map a Retell agent/number to the right company, and record AI
-- follow-ups against a call. phone_calls itself already exists (created for
-- the Retell webhook); this only adds the mapping and follow-up tables and
-- the RLS that lets a company's own team read and update its own calls.
--
-- Written defensively like our other migrations: CREATE TABLE IF NOT EXISTS
-- with just an id, then ALTER TABLE ADD COLUMN IF NOT EXISTS for every
-- column, so it is a no-op to re-run and safe even if a table already
-- exists in a different shape.

CREATE TABLE IF NOT EXISTS retell_agent_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE retell_agent_map ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE retell_agent_map ADD COLUMN IF NOT EXISTS agent_id TEXT;
ALTER TABLE retell_agent_map ADD COLUMN IF NOT EXISTS to_number TEXT;
ALTER TABLE retell_agent_map ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE retell_agent_map ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS retell_agent_map_agent_id_key ON retell_agent_map (agent_id) WHERE agent_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS retell_agent_map_to_number_key ON retell_agent_map (to_number) WHERE to_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_retell_agent_map_business_id ON retell_agent_map (business_id);

CREATE TABLE IF NOT EXISTS call_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE call_followups ADD COLUMN IF NOT EXISTS call_id TEXT;
ALTER TABLE call_followups ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE call_followups ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'note'; -- task | note | message
ALTER TABLE call_followups ADD COLUMN IF NOT EXISTS body TEXT NOT NULL DEFAULT '';
ALTER TABLE call_followups ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open'; -- open | pending_approval | sent | failed
ALTER TABLE call_followups ADD COLUMN IF NOT EXISTS pending_action_id UUID;
ALTER TABLE call_followups ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE call_followups ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$ BEGIN
  ALTER TABLE call_followups ADD CONSTRAINT call_followups_call_id_fkey FOREIGN KEY (call_id) REFERENCES phone_calls(call_id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_call_followups_call_id ON call_followups (call_id);
CREATE INDEX IF NOT EXISTS idx_call_followups_business_id ON call_followups (business_id, created_at DESC);

-- phone_calls already has RLS enabled with no policies (service role / the webhook only).
-- Add read and status-update access for the team that owns each call.
ALTER TABLE phone_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE retell_agent_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_followups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team reads own calls" ON phone_calls;
CREATE POLICY "team reads own calls" ON phone_calls FOR SELECT USING (
  business_id = auth.uid() OR business_id IN (SELECT tm.user_id FROM team_members tm WHERE tm.email = (auth.jwt() ->> 'email'))
);
DROP POLICY IF EXISTS "team updates own call status" ON phone_calls;
CREATE POLICY "team updates own call status" ON phone_calls FOR UPDATE USING (
  business_id = auth.uid() OR business_id IN (SELECT tm.user_id FROM team_members tm WHERE tm.email = (auth.jwt() ->> 'email'))
) WITH CHECK (
  business_id = auth.uid() OR business_id IN (SELECT tm.user_id FROM team_members tm WHERE tm.email = (auth.jwt() ->> 'email'))
);

-- Connecting a Retell agent/number to a company is sensitive (it decides where calls land), admins only.
DROP POLICY IF EXISTS "admins manage retell agent map" ON retell_agent_map;
CREATE POLICY "admins manage retell agent map" ON retell_agent_map FOR ALL USING (
  business_id = auth.uid() OR business_id IN (SELECT my_admin_business_ids())
) WITH CHECK (
  business_id = auth.uid() OR business_id IN (SELECT my_admin_business_ids())
);

DROP POLICY IF EXISTS "team manages call followups" ON call_followups;
CREATE POLICY "team manages call followups" ON call_followups FOR ALL USING (
  business_id = auth.uid() OR business_id IN (SELECT tm.user_id FROM team_members tm WHERE tm.email = (auth.jwt() ->> 'email'))
) WITH CHECK (
  business_id = auth.uid() OR business_id IN (SELECT tm.user_id FROM team_members tm WHERE tm.email = (auth.jwt() ->> 'email'))
);

NOTIFY pgrst, 'reload schema';
