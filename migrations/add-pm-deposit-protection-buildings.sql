-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Two gaps: deposit protection scheme tracking (a real legal
-- requirement for any AST deposit in England & Wales -- must be
-- protected within 30 days, same class of requirement as Right to
-- Rent, which PM already tracks) had no tracking anywhere, and
-- Buildings (grouping multiple units under one physical block,
-- which Estate Agency already has) didn't exist for PM at all.

ALTER TABLE pm_leases
  ADD COLUMN IF NOT EXISTS deposit_scheme TEXT, -- DPS/MyDeposits/TDS/Other
  ADD COLUMN IF NOT EXISTS deposit_scheme_ref TEXT,
  ADD COLUMN IF NOT EXISTS deposit_protected_date DATE,
  ADD COLUMN IF NOT EXISTS prescribed_info_given BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prescribed_info_date DATE;

CREATE TABLE IF NOT EXISTS pm_buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE pm_buildings ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL;
ALTER TABLE pm_buildings ADD COLUMN IF NOT EXISTS name TEXT NOT NULL;
ALTER TABLE pm_buildings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE pm_buildings ADD COLUMN IF NOT EXISTS total_units NUMERIC;
ALTER TABLE pm_buildings ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE pm_buildings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE pm_units ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES pm_buildings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pm_buildings_user_id ON pm_buildings(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_units_building_id ON pm_units(building_id);

ALTER TABLE pm_buildings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner manages own pm buildings" ON pm_buildings;
CREATE POLICY "owner manages own pm buildings" ON pm_buildings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
