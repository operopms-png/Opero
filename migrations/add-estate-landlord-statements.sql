-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Landlord Statements for Estate Agency -- mirrors Property
-- Management's existing, real 'Statements' tab (pm_landlord_payments),
-- which EA had no equivalent of at all.

-- Every landlord needs their own agreed commission rate to calculate
-- a real management fee -- previously EA's only fee figure was a
-- hardcoded 85/15 split applied to the whole business, not any
-- individual landlord's actual agreement.
ALTER TABLE estate_landlords
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 12;

CREATE TABLE IF NOT EXISTS estate_landlord_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  landlord_id UUID REFERENCES estate_landlords(id) ON DELETE SET NULL,
  property_id UUID REFERENCES estate_properties(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'Rent Share', -- Rent Share/Utility Bill/Maintenance Reimbursement/Other
  amount NUMERIC NOT NULL,
  due_date DATE,
  paid_date DATE,
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estate_landlord_payments_user_id ON estate_landlord_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_estate_landlord_payments_landlord_id ON estate_landlord_payments(landlord_id);

ALTER TABLE estate_landlord_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner manages own estate landlord payments" ON estate_landlord_payments;
CREATE POLICY "owner manages own estate landlord payments" ON estate_landlord_payments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
