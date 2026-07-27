-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- One shared table for office overhead (rent, wifi, water, electricity,
-- etc.) — the same physical office serves Developments, Property
-- Management, Estate Agency, and Vacation Rentals, so this is NOT
-- tied to any one module or project. Every module's Expenses tab
-- reads/writes this same table.

CREATE TABLE IF NOT EXISTS office_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
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

ALTER TABLE office_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own office_expenses" ON office_expenses;
CREATE POLICY "Users manage own office_expenses" ON office_expenses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
