-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- Per-project construction checklist, grouped into phases, for the
-- Developments module.

CREATE TABLE IF NOT EXISTS dev_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES dev_projects(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  task TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE dev_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own dev_checklist_items" ON dev_checklist_items;
CREATE POLICY "Users manage own dev_checklist_items" ON dev_checklist_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
