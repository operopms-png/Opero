-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- The Guest Comms tab was entirely non-functional: template list items
-- had no onClick (always showed Welcome Message), Copy to clipboard
-- didn't actually copy anything, and edits were lost on any re-render.

CREATE TABLE IF NOT EXISTS guest_comm_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  template_key TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, template_key)
);

ALTER TABLE guest_comm_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own guest_comm_templates" ON guest_comm_templates;
CREATE POLICY "Users manage own guest_comm_templates" ON guest_comm_templates FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
