-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- IMPORTANT FIX: the previous migration added portal-login linkage
-- using the column name "user_id" — but pm_landlords already used
-- user_id to mean "which business this landlord belongs to" (same as
-- every other pm_* table). Giving a landlord portal access was
-- silently overwriting that, which could make them vanish from your
-- own Landlords list. This adds a separate column for the portal
-- link and repairs any rows already affected.

ALTER TABLE pm_landlords
  ADD COLUMN IF NOT EXISTS portal_user_id UUID;

-- Repair: move whatever got written into user_id (a landlord's own
-- auth id) into portal_user_id, then restore user_id to your business
-- account so these landlords show up correctly again.
UPDATE pm_landlords
SET portal_user_id = user_id,
    user_id = 'bd780fdd-15e3-4306-8c87-788b23647ee5'
WHERE user_id != 'bd780fdd-15e3-4306-8c87-788b23647ee5';

-- Replace the RLS policies to use portal_user_id instead of user_id
DROP POLICY IF EXISTS "landlords_see_own_profile" ON pm_landlords;
CREATE POLICY "landlords_see_own_profile" ON pm_landlords
  FOR SELECT USING (auth.uid() = portal_user_id);

DROP POLICY IF EXISTS "landlords_see_own_properties" ON pm_properties;
CREATE POLICY "landlords_see_own_properties" ON pm_properties
  FOR SELECT USING (owner_id IN (SELECT id FROM pm_landlords WHERE portal_user_id = auth.uid()));

DROP POLICY IF EXISTS "landlords_see_own_payments" ON pm_landlord_payments;
CREATE POLICY "landlords_see_own_payments" ON pm_landlord_payments
  FOR SELECT USING (landlord_id IN (SELECT id FROM pm_landlords WHERE portal_user_id = auth.uid()));

NOTIFY pgrst, 'reload schema';
