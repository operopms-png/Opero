-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Vacation Rentals' Banking tab (Bank Accounts, Transactions,
-- Reconciliation, Cash Flow) currently runs entirely on local React
-- state -- there is no str_bank_accounts or str_transactions table, so
-- every account/transaction a user adds vanishes on refresh. This adds
-- the real tables, mirroring estate_bank_accounts / estate_transactions
-- (Estate Agency's working version of the same feature).

CREATE TABLE IF NOT EXISTS str_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'Current',
  balance NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'GBP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS str_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  account_id UUID REFERENCES str_bank_accounts(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'Income',        -- 'Income' | 'Expense'
  date DATE,
  category TEXT DEFAULT 'Rent',
  status TEXT NOT NULL DEFAULT 'Unreconciled', -- 'Unreconciled' | 'Reconciled'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_str_bank_accounts_user_id ON str_bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_str_transactions_user_id ON str_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_str_transactions_account_id ON str_transactions(account_id);

ALTER TABLE str_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE str_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner manages own str bank accounts" ON str_bank_accounts;
CREATE POLICY "owner manages own str bank accounts" ON str_bank_accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner manages own str transactions" ON str_transactions;
CREATE POLICY "owner manages own str transactions" ON str_transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
