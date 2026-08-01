-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- Needed for role-based staff access: Maintenance and Cleaner roles
-- need a real Maintenance/Cleaning tab in Estate Agency and PM
-- (currently only STR has both, PM only has Maintenance).

CREATE TABLE IF NOT EXISTS estate_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID REFERENCES estate_properties(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  assigned_to UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pm_cleaning_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID REFERENCES pm_properties(id) ON DELETE SET NULL,
  unit_id UUID,
  scheduled_date DATE,
  assigned_to UUID,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS estate_cleaning_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID REFERENCES estate_properties(id) ON DELETE SET NULL,
  scheduled_date DATE,
  assigned_to UUID,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY['estate_maintenance','pm_cleaning_tasks','estate_cleaning_tasks'];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_owner_only', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', tbl || '_owner_only', tbl);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
