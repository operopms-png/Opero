-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- alongside migrations/add-estate-compliance.sql

INSERT INTO system_messages (title, body, type, published, created_at)
VALUES (
  'Estate Agency: Compliance tracking, dashboard fixes',
  'We''ve shipped several improvements to the Estate Agency module: a new Compliance section for tracking Gas Safety, EICR, EPC, Fire Risk Assessment, HMO Licence and other certificates with automatic expiry alerts; a reorganised sidebar for easier navigation; a fixed display bug in the Maintenance tab; and dashboard figures (rent paid, late rent, net profit) that now reflect your real data instead of placeholder values.',
  'feature',
  true,
  now()
);
