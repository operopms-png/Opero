-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)

INSERT INTO system_messages (title, body, type, published, created_at)
VALUES (
  'Estate Agency: fixed dashboard period selector',
  'The Current Month / Last Month / Current Year / 12 Months tabs on the Estate Agency dashboard now work correctly -- previously they weren''t clickable and could appear to select the wrong option. Expenses shown now update for the selected period.',
  'fix',
  true,
  now()
);
