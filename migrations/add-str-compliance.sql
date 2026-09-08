-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Vacation Rentals had zero compliance tracking at all -- no fire
-- safety, gas safety, or EPC certificates (which PM and EA both
-- already track), and more urgently: UK short-term let licensing is
-- becoming mandatory (already required in Scotland and several
-- English councils, with a national mandatory registration scheme
-- being rolled out). Mirrors estate_compliance's structure exactly
-- (same scope/type/status shape).

CREATE TABLE IF NOT EXISTS str_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  scope TEXT NOT NULL DEFAULT 'property', -- 'property' | 'business'
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  reference TEXT,
  issued_date DATE,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_str_compliance_user_id ON str_compliance(user_id);
CREATE INDEX IF NOT EXISTS idx_str_compliance_property_id ON str_compliance(property_id);

ALTER TABLE str_compliance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner manages own str compliance" ON str_compliance;
CREATE POLICY "owner manages own str compliance" ON str_compliance
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
