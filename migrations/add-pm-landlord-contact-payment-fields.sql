-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
ALTER TABLE pm_landlords
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS account_name TEXT,
  ADD COLUMN IF NOT EXISTS account_number TEXT,
  ADD COLUMN IF NOT EXISTS sort_code TEXT,
  ADD COLUMN IF NOT EXISTS routing_number TEXT;

-- Let a landlord update their own contact/banking details (but nothing
-- else — no UPDATE policy on properties/payments, so those stay
-- read-only for them).
DROP POLICY IF EXISTS "landlords_update_own_profile" ON pm_landlords;
CREATE POLICY "landlords_update_own_profile" ON pm_landlords
  FOR UPDATE USING (auth.uid() = portal_user_id) WITH CHECK (auth.uid() = portal_user_id);

NOTIFY pgrst, 'reload schema';
