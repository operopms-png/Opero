-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- Run AFTER add-partner-access.sql.
--
-- Partners portal membership: each investor partner pays a one-time fee
-- (£75 by default) before the Partners portal unlocks. Paid through the
-- business's own connected Stripe account; staff can also mark it paid
-- or waive it from Partners → Investors.

ALTER TABLE owner_profiles ADD COLUMN IF NOT EXISTS partner_paid_at TIMESTAMPTZ;
ALTER TABLE owner_profiles ADD COLUMN IF NOT EXISTS partner_payment_ref TEXT;

NOTIFY pgrst, 'reload schema';
