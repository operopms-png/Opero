-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- Brings estate_tenants up to parity with pm_tenants: property link,
-- ID verification fields, and a status badge.
-- Note: Estate Agency doesn't have a real Units table yet (Units is still
-- a "coming soon" section), so unit_label is free text rather than a
-- foreign key to a units table, unlike pm_tenants' unit_id.

ALTER TABLE estate_tenants ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES estate_properties(id) ON DELETE SET NULL;
ALTER TABLE estate_tenants ADD COLUMN IF NOT EXISTS unit_label TEXT;
ALTER TABLE estate_tenants ADD COLUMN IF NOT EXISTS id_type TEXT;
ALTER TABLE estate_tenants ADD COLUMN IF NOT EXISTS id_url TEXT;
ALTER TABLE estate_tenants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_estate_tenants_property ON estate_tenants(property_id);

NOTIFY pgrst, 'reload schema';
