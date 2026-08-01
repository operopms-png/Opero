-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- Shared notifications feed across all modules, powering the bell
-- dropdown and (once RESEND_API_KEY is added) staff emails.

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  module TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  property_name TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_owner_only" ON notifications;
CREATE POLICY "notifications_owner_only" ON notifications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
