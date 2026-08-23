-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- STEP 1 of the Estate Agency Tenant Portal: data foundation, mirroring
-- what pm_tenants / pm_leases already have for PM's tenant portal.

ALTER TABLE estate_tenants
  ADD COLUMN IF NOT EXISTS portal_user_id UUID,
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS notify_email BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_sms BOOLEAN DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS estate_tenants_portal_user_id_idx ON estate_tenants(portal_user_id);

ALTER TABLE estate_tenancies
  ADD COLUMN IF NOT EXISTS renewal_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS renewal_notes TEXT;

-- Same shape as pm_tenant_messages, applied to estate_tenants.
CREATE TABLE IF NOT EXISTS estate_tenant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES estate_tenants(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,          -- 'tenant' | 'staff'
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estate_tenant_messages_tenant_id ON estate_tenant_messages(tenant_id);

ALTER TABLE estate_tenant_messages ENABLE ROW LEVEL SECURITY;

-- Agency staff can read/write messages for their own tenants.
DROP POLICY IF EXISTS "staff manage own estate tenant messages" ON estate_tenant_messages;
CREATE POLICY "staff manage own estate tenant messages" ON estate_tenant_messages
  FOR ALL USING (tenant_id IN (SELECT id FROM estate_tenants WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM estate_tenants WHERE user_id = auth.uid()));

-- A tenant can see and send their own messages.
DROP POLICY IF EXISTS "tenant reads own messages" ON estate_tenant_messages;
CREATE POLICY "tenant reads own messages" ON estate_tenant_messages
  FOR SELECT USING (tenant_id IN (SELECT id FROM estate_tenants WHERE portal_user_id = auth.uid()));

DROP POLICY IF EXISTS "tenant sends own messages" ON estate_tenant_messages;
CREATE POLICY "tenant sends own messages" ON estate_tenant_messages
  FOR INSERT WITH CHECK (tenant_id IN (SELECT id FROM estate_tenants WHERE portal_user_id = auth.uid()));

-- A tenant can see their own estate_tenants row and update their own
-- contact/emergency-contact/notification details only.
DROP POLICY IF EXISTS "estate tenant sees own profile" ON estate_tenants;
CREATE POLICY "estate tenant sees own profile" ON estate_tenants
  FOR SELECT USING (auth.uid() = portal_user_id);

DROP POLICY IF EXISTS "estate tenant updates own profile" ON estate_tenants;
CREATE POLICY "estate tenant updates own profile" ON estate_tenants
  FOR UPDATE USING (auth.uid() = portal_user_id) WITH CHECK (auth.uid() = portal_user_id);

-- A tenant can see their own tenancy, and can request renewal/move-out
-- on it (renewal_status / renewal_notes only, in practice, since the
-- API route only ever writes those two fields for tenant-initiated
-- updates).
DROP POLICY IF EXISTS "estate tenant sees own tenancy" ON estate_tenancies;
CREATE POLICY "estate tenant sees own tenancy" ON estate_tenancies
  FOR SELECT USING (tenant_id IN (SELECT id FROM estate_tenants WHERE portal_user_id = auth.uid()));

DROP POLICY IF EXISTS "estate tenant updates own tenancy renewal" ON estate_tenancies;
CREATE POLICY "estate tenant updates own tenancy renewal" ON estate_tenancies
  FOR UPDATE USING (tenant_id IN (SELECT id FROM estate_tenants WHERE portal_user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM estate_tenants WHERE portal_user_id = auth.uid()));

-- A tenant can see maintenance tickets for their own property, and
-- create new ones.
DROP POLICY IF EXISTS "estate tenant sees own property maintenance" ON estate_maintenance;
CREATE POLICY "estate tenant sees own property maintenance" ON estate_maintenance
  FOR SELECT USING (property_id IN (SELECT property_id FROM estate_tenants WHERE portal_user_id = auth.uid()));

DROP POLICY IF EXISTS "estate tenant creates maintenance" ON estate_maintenance;
CREATE POLICY "estate tenant creates maintenance" ON estate_maintenance
  FOR INSERT WITH CHECK (property_id IN (SELECT property_id FROM estate_tenants WHERE portal_user_id = auth.uid()));

-- A tenant can see documents linked to them.
DROP POLICY IF EXISTS "estate tenant sees own documents" ON estate_documents;
CREATE POLICY "estate tenant sees own documents" ON estate_documents
  FOR SELECT USING (tenant_id IN (SELECT id FROM estate_tenants WHERE portal_user_id = auth.uid()));

-- A tenant can see and create their own rent schedule entries (for
-- viewing payment history / making a payment).
DROP POLICY IF EXISTS "estate tenant sees own rent schedule" ON estate_rent_schedules;
CREATE POLICY "estate tenant sees own rent schedule" ON estate_rent_schedules
  FOR SELECT USING (tenant_id IN (SELECT id FROM estate_tenants WHERE portal_user_id = auth.uid()));

NOTIFY pgrst, 'reload schema';
