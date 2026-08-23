-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- STEP 1 of the Estate Agency Owner Portal: the data foundation.
-- Estate Agency currently has no concept of a landlord/property-owner
-- client at all (unlike PM's pm_landlords) -- this adds it, following
-- the exact same shape as pm_landlords so the rest of the build
-- (portal page, "View Portal" button) can mirror PM's pattern closely.
--
-- IMPORTANT: portal_user_id is a SEPARATE column from user_id from the
-- start. PM originally reused user_id for portal login and it collided
-- with user_id's existing meaning ("which business this row belongs
-- to") -- see migrations/fix-pm-landlord-portal-user-id-collision.sql.
-- Not repeating that mistake here.

CREATE TABLE IF NOT EXISTS estate_landlords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,              -- the Sangsters/agency account this landlord belongs to
  portal_user_id UUID,                -- set once the landlord is given portal login access
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  bank_name TEXT,
  account_name TEXT,
  account_number TEXT,
  sort_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE estate_properties
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES estate_landlords(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_estate_landlords_user_id ON estate_landlords(user_id);
CREATE INDEX IF NOT EXISTS idx_estate_properties_owner_id ON estate_properties(owner_id);

ALTER TABLE estate_landlords ENABLE ROW LEVEL SECURITY;

-- Agency staff manage their own landlords (same pattern as every other
-- estate_* table -- scoped by the business's own user_id, not the
-- landlord's portal_user_id).
DROP POLICY IF EXISTS "staff manage own estate landlords" ON estate_landlords;
CREATE POLICY "staff manage own estate landlords" ON estate_landlords
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- A landlord can see their own estate_landlords row
DROP POLICY IF EXISTS "estate landlords see own profile" ON estate_landlords;
CREATE POLICY "estate landlords see own profile" ON estate_landlords
  FOR SELECT USING (auth.uid() = portal_user_id);

-- A landlord can update their own contact/banking details only
DROP POLICY IF EXISTS "estate landlords update own profile" ON estate_landlords;
CREATE POLICY "estate landlords update own profile" ON estate_landlords
  FOR UPDATE USING (auth.uid() = portal_user_id) WITH CHECK (auth.uid() = portal_user_id);

-- A landlord can see properties they own
DROP POLICY IF EXISTS "estate landlords see own properties" ON estate_properties;
CREATE POLICY "estate landlords see own properties" ON estate_properties
  FOR SELECT USING (owner_id IN (SELECT id FROM estate_landlords WHERE portal_user_id = auth.uid()));

NOTIFY pgrst, 'reload schema';
