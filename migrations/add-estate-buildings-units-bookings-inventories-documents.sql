-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- Replaces the last five "coming soon" Estate Agency nav stubs with real
-- tables: Buildings, Units, Viewings (property viewings), Inventories
-- (check-in/check-out reports), Documents.
--
-- Safe to run whether or not you already ran an earlier version of this
-- migration that created "estate_bookings" -- it renames that table to
-- estate_viewings if found, rather than creating a duplicate.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='estate_bookings')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='estate_viewings') THEN
    ALTER TABLE estate_bookings RENAME TO estate_viewings;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS estate_buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  total_units INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS estate_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  building_id UUID REFERENCES estate_buildings(id) ON DELETE SET NULL,
  property_id UUID REFERENCES estate_properties(id) ON DELETE SET NULL,
  unit_number TEXT NOT NULL,
  floor TEXT,
  bedrooms TEXT,
  bathrooms TEXT,
  status TEXT DEFAULT 'Vacant',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS estate_viewings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID REFERENCES estate_properties(id) ON DELETE SET NULL,
  prospect_name TEXT NOT NULL,
  prospect_email TEXT,
  prospect_phone TEXT,
  scheduled_at TIMESTAMPTZ,
  status TEXT DEFAULT 'Scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS estate_inventories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID REFERENCES estate_properties(id) ON DELETE SET NULL,
  tenancy_id UUID REFERENCES estate_tenancies(id) ON DELETE SET NULL,
  type TEXT DEFAULT 'Check-in',
  inspection_date DATE,
  condition_summary TEXT,
  document_url TEXT,
  status TEXT DEFAULT 'Draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS estate_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID REFERENCES estate_properties(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES estate_tenants(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Other',
  file_url TEXT,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY['estate_buildings','estate_units','estate_viewings','estate_inventories','estate_documents'];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_owner_only', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', tbl || '_owner_only', tbl);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_estate_units_building ON estate_units(building_id);
CREATE INDEX IF NOT EXISTS idx_estate_units_property ON estate_units(property_id);
CREATE INDEX IF NOT EXISTS idx_estate_viewings_property ON estate_viewings(property_id);
CREATE INDEX IF NOT EXISTS idx_estate_inventories_property ON estate_inventories(property_id);
CREATE INDEX IF NOT EXISTS idx_estate_documents_property ON estate_documents(property_id);

NOTIFY pgrst, 'reload schema';
