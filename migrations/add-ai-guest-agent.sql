-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- Supports the AI Guest Agent: a per-property knowledge base the AI
-- draws from, persisted agent on/off state, a persisted activity log
-- (both were only ever in local React state before — reset on every
-- page refresh), and a guest message log.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS wifi_name TEXT,
  ADD COLUMN IF NOT EXISTS wifi_password TEXT,
  ADD COLUMN IF NOT EXISTS house_rules TEXT,
  ADD COLUMN IF NOT EXISTS checkin_instructions TEXT,
  ADD COLUMN IF NOT EXISTS checkout_instructions TEXT;

CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, agent_key)
);

CREATE TABLE IF NOT EXISTS ai_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_key TEXT NOT NULL,
  action TEXT NOT NULL,
  property_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guest_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  guest_name TEXT,
  message TEXT NOT NULL,
  sender TEXT NOT NULL DEFAULT 'guest',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own ai_agents" ON ai_agents;
CREATE POLICY "Users manage own ai_agents" ON ai_agents FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own ai_activity_log" ON ai_activity_log;
CREATE POLICY "Users manage own ai_activity_log" ON ai_activity_log FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own guest_messages" ON guest_messages;
CREATE POLICY "Users manage own guest_messages" ON guest_messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
