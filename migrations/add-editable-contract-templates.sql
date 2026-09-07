-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Makes contract templates actually editable. Previously
-- company_documents (category='contract_template') only stored an
-- uploaded file -- an opaque PDF/DOC nobody can change names/dates in
-- from inside Opero. Templates can now ALSO be written as text with
-- merge fields ({{tenant_name}}, {{property_name}}, {{start_date}},
-- {{end_date}}, {{rent}}, {{deposit}}), auto-filled from the real
-- tenancy when picked, and editable before sending. File upload still
-- works for templates that don't need this (e.g. scanned documents).

ALTER TABLE company_documents
  ADD COLUMN IF NOT EXISTS body TEXT;

-- The final, staff-reviewed/edited text for THIS specific tenancy --
-- what the tenant actually sees and signs on the public signing page.
-- Separate from the template's own body, which stays a reusable
-- master copy untouched by any one tenancy's edits.
ALTER TABLE estate_tenancies
  ADD COLUMN IF NOT EXISTS contract_text TEXT;

ALTER TABLE pm_leases
  ADD COLUMN IF NOT EXISTS contract_text TEXT;

NOTIFY pgrst, 'reload schema';
