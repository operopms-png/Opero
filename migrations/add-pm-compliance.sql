-- Property Management had no compliance tracking at all. This covers two
-- distinct things a PM business needs to track, in one table distinguished
-- by `scope`:
--   'property' — certificates collected FROM landlords for each property
--                (Gas Safety, EICR, EPC, etc.) — property_id required
--   'business' — the PM agency's own regulatory requirements to operate
--                (Client Money Protection, redress scheme membership,
--                 professional indemnity insurance, etc.) — no property_id

CREATE TABLE IF NOT EXISTS pm_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  scope TEXT NOT NULL DEFAULT 'property' CHECK (scope IN ('property', 'business')),
  property_id UUID REFERENCES pm_properties(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  reference TEXT,
  issued_date DATE,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pm_compliance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own pm_compliance" ON pm_compliance;
CREATE POLICY "Users manage own pm_compliance" ON pm_compliance
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
