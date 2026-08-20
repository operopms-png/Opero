-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- Adds real compliance certificate/licence tracking to the Estate Agency
-- module (Gas Safety, EPC, EICR, HMO Licence, etc.) with expiry-based
-- status computed client-side from expiry_date.

CREATE TABLE IF NOT EXISTS estate_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID REFERENCES estate_properties(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  reference TEXT,
  issued_date DATE,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE estate_compliance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "estate_compliance_owner_only" ON estate_compliance;
CREATE POLICY "estate_compliance_owner_only" ON estate_compliance
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_estate_compliance_expiry ON estate_compliance(expiry_date);
CREATE INDEX IF NOT EXISTS idx_estate_compliance_property ON estate_compliance(property_id);

NOTIFY pgrst, 'reload schema';
