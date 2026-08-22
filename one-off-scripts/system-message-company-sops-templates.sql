-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- alongside migrations/create-company-documents.sql

INSERT INTO system_messages (title, body, type, published, created_at)
VALUES (
  'New: Company SOPs and Contract Templates',
  'Property Management, Developments, Vacation Rentals and Estate Agency now each have two new tabs — Company SOPs and Contract Templates — for storing staff training material and reusable landlord/tenant agreements in one central place, separate from your per-property documents.',
  'feature',
  true,
  now()
);
