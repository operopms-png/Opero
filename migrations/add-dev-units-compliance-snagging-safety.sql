-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Four new real features for Developments: Units/Plots (the actual
-- sellable/lettable breakdown of a project, which didn't exist at
-- all before -- a "Project" was previously one single record with no
-- unit-level granularity), Compliance, Snagging, and Health & Safety.
-- Compliance/Snagging both reference dev_units since a document or
-- defect is often tied to a specific unit, not just the whole project.

CREATE TABLE IF NOT EXISTS dev_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES dev_projects(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  unit_type TEXT, -- e.g. '2-Bed Apartment', '3-Bed House'
  size_sqft NUMERIC,
  status TEXT NOT NULL DEFAULT 'Available', -- Available/Reserved/Exchanged/Sold/Completed
  price NUMERIC,
  buyer_name TEXT,
  buyer_email TEXT,
  buyer_solicitor TEXT,
  reservation_date DATE,
  exchange_date DATE,
  completion_date DATE,
  deposit_amount NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dev_units_project_id ON dev_units(project_id);
CREATE INDEX IF NOT EXISTS idx_dev_units_user_id ON dev_units(user_id);

CREATE TABLE IF NOT EXISTS dev_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES dev_projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- Planning Permission/Building Control/NHBC Warranty/Fire Safety/Other
  status TEXT NOT NULL DEFAULT 'Pending', -- Pending/Approved/Expired
  reference_number TEXT,
  issue_date DATE,
  expiry_date DATE,
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dev_compliance_project_id ON dev_compliance(project_id);
CREATE INDEX IF NOT EXISTS idx_dev_compliance_user_id ON dev_compliance(user_id);

CREATE TABLE IF NOT EXISTS dev_snagging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES dev_projects(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES dev_units(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'Medium', -- Low/Medium/High
  status TEXT NOT NULL DEFAULT 'Open', -- Open/In Progress/Resolved
  assigned_to TEXT,
  photo_url TEXT,
  reported_date DATE,
  resolved_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dev_snagging_project_id ON dev_snagging(project_id);
CREATE INDEX IF NOT EXISTS idx_dev_snagging_unit_id ON dev_snagging(unit_id);
CREATE INDEX IF NOT EXISTS idx_dev_snagging_user_id ON dev_snagging(user_id);

CREATE TABLE IF NOT EXISTS dev_health_safety (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES dev_projects(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL DEFAULT 'Site Diary', -- Site Diary/RAMS/Site Induction/Incident Report/Toolbox Talk
  date DATE,
  title TEXT NOT NULL,
  description TEXT,
  weather TEXT, -- only meaningful for Site Diary entries
  workers_on_site INTEGER, -- only meaningful for Site Diary entries
  document_url TEXT,
  logged_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dev_health_safety_project_id ON dev_health_safety(project_id);
CREATE INDEX IF NOT EXISTS idx_dev_health_safety_user_id ON dev_health_safety(user_id);

ALTER TABLE dev_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_snagging ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_health_safety ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner manages own dev units" ON dev_units;
CREATE POLICY "owner manages own dev units" ON dev_units
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner manages own dev compliance" ON dev_compliance;
CREATE POLICY "owner manages own dev compliance" ON dev_compliance
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner manages own dev snagging" ON dev_snagging;
CREATE POLICY "owner manages own dev snagging" ON dev_snagging
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner manages own dev health safety" ON dev_health_safety;
CREATE POLICY "owner manages own dev health safety" ON dev_health_safety
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
