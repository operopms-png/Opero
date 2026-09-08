-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Staff Centre CRM was missing an activity history (Notes was one
-- static text box, not a timeline) and follow-up reminders (no due
-- dates tied to a contact or deal at all).
--
-- Written defensively: CREATE TABLE IF NOT EXISTS is a no-op if a
-- table with that name already exists in any form, even with a
-- different/incomplete set of columns -- which is what happened on
-- the first run of this migration (crm_activities already existed
-- without deal_id, so the CREATE TABLE was skipped and the later
-- CREATE INDEX on deal_id failed). Using ALTER TABLE ADD COLUMN IF
-- NOT EXISTS for every column instead fixes that regardless of
-- whatever state the table is currently in.

CREATE TABLE IF NOT EXISTS crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES crm_contacts(id) ON DELETE CASCADE;
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES crm_deals(id) ON DELETE CASCADE;
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'Note';
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS logged_by TEXT;
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_crm_activities_contact_id ON crm_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_deal_id ON crm_activities(deal_id);

CREATE TABLE IF NOT EXISTS crm_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE crm_followups ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE crm_followups ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES crm_contacts(id) ON DELETE CASCADE;
ALTER TABLE crm_followups ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES crm_deals(id) ON DELETE CASCADE;
ALTER TABLE crm_followups ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE crm_followups ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE crm_followups ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Pending';
ALTER TABLE crm_followups ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE crm_followups ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE crm_followups ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

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
