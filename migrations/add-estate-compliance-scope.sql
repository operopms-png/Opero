-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- EA's Compliance tab only tracked property compliance (certificates
-- from landlords). PM's has a second scope: business compliance (CMP,
-- redress scheme, insurance, etc -- what the agency itself needs to
-- legally operate). Adding the same split to EA.

ALTER TABLE estate_compliance
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'property';

NOTIFY pgrst, 'reload schema';
