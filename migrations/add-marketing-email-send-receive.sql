-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- marketing_emails had no actual email body -- just subject/template/
-- notes -- so there was nothing to send even if it were wired up.
-- Adding real send/receive, reusing the exact pattern CRM already has
-- working (app/api/crm-send + app/api/email-inbound): Resend for
-- outbound, a plus-alias Reply-To for routing inbound replies back to
-- the right tenant + email without cross-tenant lookups.

ALTER TABLE marketing_emails
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS marketing_email_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketing_email_id UUID NOT NULL REFERENCES marketing_emails(id) ON DELETE CASCADE,
  from_address TEXT,
  subject TEXT,
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_email_replies_email_id ON marketing_email_replies(marketing_email_id);

ALTER TABLE marketing_email_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner reads own marketing email replies" ON marketing_email_replies;
CREATE POLICY "owner reads own marketing email replies" ON marketing_email_replies
  FOR SELECT USING (marketing_email_id IN (SELECT id FROM marketing_emails WHERE user_id = auth.uid()));

NOTIFY pgrst, 'reload schema';
