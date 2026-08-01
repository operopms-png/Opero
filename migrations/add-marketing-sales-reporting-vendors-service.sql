-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- Real, persisted tables for Marketing, Sales, Reporting, Contractors,
-- and Service — these were all pure local React state before, nothing
-- ever saved. Each table has a `module` column (like crm_contacts/
-- crm_deals already do) so the same tables work across Vacation
-- Rentals, Property Management, Estate Agency, and Developments.
-- All policies use real auth.uid() = user_id checks (not the wide-open
-- `true` pattern found and fixed elsewhere tonight).

-- MARKETING
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, module TEXT NOT NULL,
  name TEXT NOT NULL, type TEXT DEFAULT 'Email', status TEXT DEFAULT 'Draft',
  audience TEXT, budget NUMERIC, start_date DATE, end_date DATE, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS marketing_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, module TEXT NOT NULL,
  subject TEXT NOT NULL, to_recipient TEXT, template TEXT, status TEXT DEFAULT 'Draft',
  scheduled_at TIMESTAMPTZ, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS marketing_socials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, module TEXT NOT NULL,
  caption TEXT NOT NULL, platform TEXT DEFAULT 'Instagram', scheduled_at TIMESTAMPTZ,
  status TEXT DEFAULT 'Draft', link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS marketing_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, module TEXT NOT NULL,
  name TEXT NOT NULL, platform TEXT DEFAULT 'Google', budget NUMERIC, status TEXT DEFAULT 'Draft',
  start_date DATE, end_date DATE, clicks INTEGER DEFAULT 0, impressions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SALES
CREATE TABLE IF NOT EXISTS sales_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, module TEXT NOT NULL,
  name TEXT NOT NULL, email TEXT, phone TEXT, source TEXT DEFAULT 'Direct',
  status TEXT DEFAULT 'New', value NUMERIC, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sales_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, module TEXT NOT NULL,
  name TEXT NOT NULL, contact TEXT, value NUMERIC, stage TEXT DEFAULT 'Enquiry',
  close_date DATE, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sales_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, module TEXT NOT NULL,
  client TEXT NOT NULL, property TEXT, amount NUMERIC, valid_until DATE,
  status TEXT DEFAULT 'Draft', notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sales_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, module TEXT NOT NULL,
  title TEXT NOT NULL, contact TEXT, meeting_date DATE, meeting_time TEXT,
  type TEXT DEFAULT 'Call', notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- REPORTING
CREATE TABLE IF NOT EXISTS reporting_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, module TEXT NOT NULL,
  name TEXT NOT NULL, type TEXT DEFAULT 'Revenue', period TEXT DEFAULT 'This Month',
  format TEXT DEFAULT 'PDF', notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reporting_scheduled (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, module TEXT NOT NULL,
  name TEXT NOT NULL, type TEXT DEFAULT 'Revenue', frequency TEXT DEFAULT 'Weekly',
  recipients TEXT, next_run DATE, format TEXT DEFAULT 'PDF', status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CONTRACTORS / VENDORS
CREATE TABLE IF NOT EXISTS vendor_contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, module TEXT NOT NULL,
  name TEXT NOT NULL, email TEXT, phone TEXT, type TEXT DEFAULT 'Cleaner',
  company TEXT, status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS vendor_work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, module TEXT NOT NULL,
  title TEXT NOT NULL, description TEXT, contractor_id UUID REFERENCES vendor_contractors(id) ON DELETE SET NULL,
  priority TEXT DEFAULT 'Medium', status TEXT DEFAULT 'Open', property TEXT, invoice_amount NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SERVICE
CREATE TABLE IF NOT EXISTS service_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, module TEXT NOT NULL,
  title TEXT NOT NULL, type TEXT DEFAULT 'Complaint', priority TEXT DEFAULT 'Medium',
  status TEXT DEFAULT 'Open', contact TEXT, property TEXT, description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS service_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, module TEXT NOT NULL,
  question TEXT NOT NULL, answer TEXT NOT NULL, category TEXT DEFAULT 'General',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS + real owner-only policies on all 14 tables
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'marketing_campaigns','marketing_emails','marketing_socials','marketing_ads',
    'sales_leads','sales_deals','sales_quotes','sales_meetings',
    'reporting_reports','reporting_scheduled',
    'vendor_contractors','vendor_work_orders',
    'service_tickets','service_faqs'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_owner_only', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', tbl || '_owner_only', tbl);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
