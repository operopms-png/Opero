-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- Lets a landlord have their own login, linked via user_id, and see
-- ONLY their own properties and payments — not the whole business's.

ALTER TABLE pm_landlords
  ADD COLUMN IF NOT EXISTS user_id UUID;

-- A landlord can see their own pm_landlords row
DROP POLICY IF EXISTS "landlords_see_own_profile" ON pm_landlords;
CREATE POLICY "landlords_see_own_profile" ON pm_landlords
  FOR SELECT USING (auth.uid() = user_id);

-- A landlord can see properties they own
DROP POLICY IF EXISTS "landlords_see_own_properties" ON pm_properties;
CREATE POLICY "landlords_see_own_properties" ON pm_properties
  FOR SELECT USING (owner_id IN (SELECT id FROM pm_landlords WHERE user_id = auth.uid()));

-- A landlord can see payments made to them
DROP POLICY IF EXISTS "landlords_see_own_payments" ON pm_landlord_payments;
CREATE POLICY "landlords_see_own_payments" ON pm_landlord_payments
  FOR SELECT USING (landlord_id IN (SELECT id FROM pm_landlords WHERE user_id = auth.uid()));

NOTIFY pgrst, 'reload schema';
