-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
INSERT INTO system_messages (title, body, type, published, created_at)
VALUES (
  'Estate Agency forms now match Property Management exactly',
  'Tenants, Maintenance, Cleaning, and Documents in Estate Agency now have the same fields, field order, and layout as Property Management. Tenants'' Unit field is now a real dropdown instead of free text. Maintenance and Cleaning both gained an Assigned To field and photo upload. Also fixed a live bug: Cleaning''s Assigned To field was typed to only accept IDs, so typing a cleaner''s name into it would have failed to save.',
  'fix',
  true,
  now()
);
