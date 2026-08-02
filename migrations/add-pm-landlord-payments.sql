-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- Tracks money paid OUT to a landlord/owner (their rent share, or a
-- bill paid on their behalf), with a due date vs paid date so it's
-- easy to see who's being paid on time and who's overdue.

CREATE TABLE IF NOT EXISTS pm_landlord_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  landlord_id UUID REFERENCES pm_landlords(id) ON DELETE SET NULL,
  property_id UUID REFERENCES pm_properties(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'Rent Share',
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date DATE,
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pm_landlord_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pm_landlord_payments_owner_only" ON pm_landlord_payments;
CREATE POLICY "pm_landlord_payments_owner_only" ON pm_landlord_payments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
