-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Property Management's Banking tab has the exact same bug found and
-- fixed in Vacation Rentals (see add-str-banking-tables.sql): it runs
-- entirely on local React state, no pm_bank_accounts or pm_transactions
-- table exists, so everything added vanishes on refresh. Same fix,
-- same shape, applied to PM.

CREATE TABLE IF NOT EXISTS pm_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'Current',
  balance NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'GBP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pm_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  account_id UUID REFERENCES pm_bank_accounts(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'Income',
  date DATE,
  category TEXT DEFAULT 'Rent',
  status TEXT NOT NULL DEFAULT 'Unreconciled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_bank_accounts_user_id ON pm_bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_transactions_user_id ON pm_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_transactions_account_id ON pm_transactions(account_id);

ALTER TABLE pm_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner manages own pm bank accounts" ON pm_bank_accounts;
CREATE POLICY "owner manages own pm bank accounts" ON pm_bank_accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner manages own pm transactions" ON pm_transactions;
CREATE POLICY "owner manages own pm transactions" ON pm_transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
