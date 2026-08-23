-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
INSERT INTO system_messages (title, body, type, published, created_at)
VALUES (
  'Estate Agency Landlords form now matches Property Management exactly',
  'Add/Edit Landlord in Estate Agency now has the identical field set and order as Property Management: Full Name, Email, Phone, Address, Notes, ID Type, ID Document, Assigned Properties, then Bank Details (Bank Name, Account Name, Account Number, Sort Code, IBAN, SWIFT/BIC).',
  'fix',
  true,
  now()
);
