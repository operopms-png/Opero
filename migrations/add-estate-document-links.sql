-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Documents could previously only link to a Property. Adds real
-- landlord_id and tenant_id columns so a document (ID, agreement,
-- contract) can be filed against the actual person it belongs to.
-- The existing query already tried to join estate_tenants(name) with
-- no real tenant_id column behind it -- that join was silently
-- returning nothing; this fixes it properly.

ALTER TABLE estate_documents
  ADD COLUMN IF NOT EXISTS landlord_id UUID REFERENCES estate_landlords(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES estate_tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_estate_documents_landlord_id ON estate_documents(landlord_id);
CREATE INDEX IF NOT EXISTS idx_estate_documents_tenant_id ON estate_documents(tenant_id);

NOTIFY pgrst, 'reload schema';
