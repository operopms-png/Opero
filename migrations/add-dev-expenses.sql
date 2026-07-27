-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- The Developments "Expenses" tab was pure local React state with no
-- database behind it at all — every expense vanished on refresh.

CREATE TABLE IF NOT EXISTS dev_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES dev_projects(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  vendor TEXT,
  category TEXT NOT NULL DEFAULT 'Overhead',
  amount NUMERIC NOT NULL DEFAULT 0,
  date DATE,
  status TEXT NOT NULL DEFAULT 'Unpaid',
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE dev_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own dev_expenses" ON dev_expenses;
CREATE POLICY "Users manage own dev_expenses" ON dev_expenses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
