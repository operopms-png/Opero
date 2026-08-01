-- Run this in Supabase SQL Editor
-- The existing estate_*_all policies use `true` / `true` for their
-- rule, meaning RLS is technically "on" but the policy allows ANY
-- user to read/write ANY row — effectively no protection at all.
-- Replaces each with a real rule scoped to the owning business
-- (auth.uid() = user_id).

DROP POLICY IF EXISTS "estate_properties_all" ON estate_properties;
CREATE POLICY "estate_properties_all" ON estate_properties
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "estate_rent_schedules_all" ON estate_rent_schedules;
CREATE POLICY "estate_rent_schedules_all" ON estate_rent_schedules
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "estate_tenancies_all" ON estate_tenancies;
CREATE POLICY "estate_tenancies_all" ON estate_tenancies
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "estate_tenants_all" ON estate_tenants;
CREATE POLICY "estate_tenants_all" ON estate_tenants
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "estate_transactions_all" ON estate_transactions;
CREATE POLICY "estate_transactions_all" ON estate_transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "estate_vacancies_all" ON estate_vacancies;
CREATE POLICY "estate_vacancies_all" ON estate_vacancies
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "estate_bank_accounts_all" ON estate_bank_accounts;
CREATE POLICY "estate_bank_accounts_all" ON estate_bank_accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "estate_mortgages_all" ON estate_mortgages;
CREATE POLICY "estate_mortgages_all" ON estate_mortgages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
