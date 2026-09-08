-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Same feature as Estate Agency's Tenant Checks -- Right to Rent
-- (Immigration Act 2014) and Bank Statement affordability review --
-- ported to Property Management, keyed against pm_leases instead of
-- estate_tenancies. PM manages real tenancies with real tenants, and
-- Right to Rent is a legal requirement for any UK letting, not
-- something specific to Estate Agency.

CREATE TABLE IF NOT EXISTS pm_right_to_rent_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lease_id UUID NOT NULL REFERENCES pm_leases(id) ON DELETE CASCADE,
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

CREATE UNIQUE INDEX IF NOT EXISTS pm_rtr_checks_lease_idx ON pm_right_to_rent_checks(lease_id);

CREATE TABLE IF NOT EXISTS pm_bank_statement_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lease_id UUID NOT NULL REFERENCES pm_leases(id) ON DELETE CASCADE,
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
  ai_assessment TEXT,
  ai_assessment_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pm_bank_checks_lease_idx ON pm_bank_statement_checks(lease_id);

ALTER TABLE pm_right_to_rent_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_bank_statement_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner manages own pm rtr checks" ON pm_right_to_rent_checks;
CREATE POLICY "owner manages own pm rtr checks" ON pm_right_to_rent_checks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner manages own pm bank checks" ON pm_bank_statement_checks;
CREATE POLICY "owner manages own pm bank checks" ON pm_bank_statement_checks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
