-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Staff Centre CRM was missing an activity history (Notes was one
-- static text box, not a timeline) and follow-up reminders (no due
-- dates tied to a contact or deal at all).

CREATE TABLE IF NOT EXISTS crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES crm_deals(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'Note', -- Call/Email/Meeting/Note
  content TEXT NOT NULL,
  logged_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_activities_contact_id ON crm_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_deal_id ON crm_activities(deal_id);

CREATE TABLE IF NOT EXISTS crm_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES crm_deals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending', -- Pending/Done
  assigned_to TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_followups_contact_id ON crm_followups(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_followups_due_date ON crm_followups(due_date);

ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_followups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner manages own crm activities" ON crm_activities;
CREATE POLICY "owner manages own crm activities" ON crm_activities
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner manages own crm followups" ON crm_followups;
CREATE POLICY "owner manages own crm followups" ON crm_followups
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
