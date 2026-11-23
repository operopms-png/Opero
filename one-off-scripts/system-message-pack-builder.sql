-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke), after migrations/investment-packs.sql
INSERT INTO system_messages (title, body, type, published, created_at)
VALUES (
  'Pack Builder and Investment Packs',
  'Marketing has a new Pack Builder tab. Build an investment pack with the car, the property and how the car covers the rent, add photos, then press Create link to send the investor one private link. Every figure shows in J$ and £ and is split per investor, every pack is saved and has a stage (Draft, Sent, Opened, Interested, Committed, Funded), and the Dashboard has an Investment Packs box showing where each pack has got to.',
  'feature',
  true,
  now()
);
