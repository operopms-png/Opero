-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Tenant Checks for Estate Agency: Right to Rent (Immigration Act 2014
-- s.22) and Bank Statement / affordability review. One row per
-- tenancy per check type -- staff update status/re-check date over
-- time rather than a full history log, matching how Landlord
-- Statements and other single-record checks already work in this app.

CREATE TABLE IF NOT EXISTS estate_right_to_rent_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenancy_id UUID NOT NULL REFERENCES estate_tenancies(id) ON DELETE CASCADE,
  full_name TEXT,
  date_of_birth DATE,
  current_address TEXT,
  check_type TEXT NOT NULL DEFAULT 'Online', -- 'Manual' | 'Online' | 'Birth Certificate + NI'
  document_type TEXT, -- for Manual checks: Passport/BRP/Visa/etc
  share_code TEXT, -- Online checks only
  ni_number TEXT, -- ONLY relevant for the 'Birth Certificate + NI' combination path -- never collected for Manual or Online checks
  status TEXT NOT NULL DEFAULT 'Unlimited', -- 'Unlimited' | 'Time-limited' | 'No Right to Rent'
  check_date DATE,
  checked_by TEXT,
  recheck_date DATE, -- required for 'Time-limited' status
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS estate_rtr_checks_tenancy_idx ON estate_right_to_rent_checks(tenancy_id);

CREATE TABLE IF NOT EXISTS estate_bank_statement_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenancy_id UUID NOT NULL REFERENCES estate_tenancies(id) ON DELETE CASCADE,
  statement_start DATE,
  statement_end DATE,
  declared_income NUMERIC,
  income_regular BOOLEAN NOT NULL DEFAULT false,
  no_overdraft BOOLEAN NOT NULL DEFAULT false,
  no_bounced_payments BOOLEAN NOT NULL DEFAULT false,
  no_gambling_flags BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'Passed', -- 'Passed' | 'Flagged' | 'Failed'
  document_url TEXT,
  notes TEXT,
  checked_by TEXT,
  check_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS estate_bank_checks_tenancy_idx ON estate_bank_statement_checks(tenancy_id);

ALTER TABLE estate_right_to_rent_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE estate_bank_statement_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner manages own rtr checks" ON estate_right_to_rent_checks;
CREATE POLICY "owner manages own rtr checks" ON estate_right_to_rent_checks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner manages own bank checks" ON estate_bank_statement_checks;
CREATE POLICY "owner manages own bank checks" ON estate_bank_statement_checks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
