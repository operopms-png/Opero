-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
INSERT INTO system_messages (title, body, type, published, created_at)
VALUES (
  'Vacation Rentals: Banking, Analytics, and Reports now use real data',
  'The Banking tab (Bank Accounts, Transactions, Reconciliation) now saves properly -- previously it only existed in memory and was lost on refresh. Revenue and Occupancy charts on Home and Analytics now reflect real bookings instead of fixed placeholder shapes, the P&L report''s LL Costs column is now calculated instead of always showing £0, and the Integrations tab shows real connection status.',
  'fix',
  true,
  now()
);
