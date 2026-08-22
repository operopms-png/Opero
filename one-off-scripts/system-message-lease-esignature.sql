-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
INSERT INTO system_messages (title, body, type, published, created_at)
VALUES (
  'New: Sign leases electronically',
  'Every lease in Property Management now has a "Copy Link" button that generates a secure signing link -- no login required for the tenant or landlord. Signing captures a typed or drawn signature, IP address, device, and a document hash for a proper audit trail, and the lease shows Signed once both parties have signed.',
  'feature',
  true,
  now()
);
