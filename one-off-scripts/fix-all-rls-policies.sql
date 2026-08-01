-- Run this in Supabase SQL Editor
-- Drops ALL existing policies on each table (whatever they're named)
-- and replaces with one real rule scoped to auth.uid() = user_id.
-- Safe to run even if a table's policy is already correct.

DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
  tables TEXT[] := ARRAY[
    'dev_budget_items','dev_documents','dev_investors','dev_milestones','dev_projects',
    'pm_documents','pm_inspections','pm_landlords','pm_leases','pm_maintenance',
    'pm_properties','pm_rent_payments','pm_tenants','pm_units',
    'crm_activities','crm_companies','crm_contacts','crm_deals','crm_meetings','crm_tasks'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Only proceed if the table actually exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=tbl) THEN
      -- Drop every existing policy on this table, whatever it's named
      FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=tbl LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
      END LOOP;

      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

      -- Only create the policy if the table actually has a user_id column
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=tbl AND column_name='user_id') THEN
        EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', tbl || '_owner_only', tbl);
        RAISE NOTICE 'Fixed: %', tbl;
      ELSE
        RAISE NOTICE 'SKIPPED (no user_id column): %', tbl;
      END IF;
    ELSE
      RAISE NOTICE 'SKIPPED (table does not exist): %', tbl;
    END IF;
  END LOOP;
END $$;
