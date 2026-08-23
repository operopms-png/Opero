-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
INSERT INTO system_messages (title, body, type, published, created_at)
VALUES (
  'Property Management: Banking, Reports, and Transactions fixed',
  'The Banking tab (Bank Accounts, Transactions, Reconciliation) now saves properly -- previously it only existed in memory and was lost on refresh. The Reports P&L table no longer shows the same number twice under different column names -- Property Costs and Expenses are now calculated separately. The Collection Rate gauge on Owner Reports/Statements now shows an accurate proportional arc instead of always appearing full. The Add Transaction form now has Account and Category fields that actually save.',
  'fix',
  true,
  now()
);
