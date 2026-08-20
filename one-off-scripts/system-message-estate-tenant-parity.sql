-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- alongside migrations/add-estate-tenants-parity-fields.sql

INSERT INTO system_messages (title, body, type, published, created_at)
VALUES (
  'Estate Agency: richer tenant records',
  'Adding a tenant in Estate Agency now captures property, unit, ID type, and an ID document upload, matching Property Management. Existing tenants are unaffected -- the new fields are optional and can be filled in via Edit.',
  'feature',
  true,
  now()
);
