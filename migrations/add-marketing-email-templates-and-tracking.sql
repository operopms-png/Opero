-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- STEP 1 of the Marketing Email rebuild (HubSpot-style Manage/Templates/
-- Analyze tabs): the data foundation.
--
-- 1. marketing_email_templates -- real, reusable templates staff create
--    themselves (not the current dead 'template' text field).
--
-- 2. marketing_emails gets a resend_email_id -- Resend's own ID for the
--    sent message, needed to match incoming delivery/open/click/bounce
--    webhook events back to the right row.
--
-- 3. marketing_email_events -- one row per tracked event (delivered,
--    opened, clicked, bounced, complained) per email. Kept as a log
--    rather than pre-aggregated counters, so Analyze can compute
--    open rate / click rate / bounce rate / etc for any date range
--    without needing separate counter columns to keep in sync.

CREATE TABLE IF NOT EXISTS marketing_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  module TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Other',
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_email_templates_user_module ON marketing_email_templates(user_id, module);

ALTER TABLE marketing_email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner manages own email templates" ON marketing_email_templates;
CREATE POLICY "owner manages own email templates" ON marketing_email_templates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE marketing_emails
  ADD COLUMN IF NOT EXISTS resend_email_id TEXT;

CREATE INDEX IF NOT EXISTS idx_marketing_emails_resend_id ON marketing_emails(resend_email_id);

CREATE TABLE IF NOT EXISTS marketing_email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketing_email_id UUID NOT NULL REFERENCES marketing_emails(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained'
  device_type TEXT,   -- 'Desktop' | 'Mobile' | 'Other', from Resend's user-agent parsing where available
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_email_events_email_id ON marketing_email_events(marketing_email_id);

ALTER TABLE marketing_email_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner reads own email events" ON marketing_email_events;
CREATE POLICY "owner reads own email events" ON marketing_email_events
  FOR SELECT USING (marketing_email_id IN (SELECT id FROM marketing_emails WHERE user_id = auth.uid()));

NOTIFY pgrst, 'reload schema';
