-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- app/pm/page.tsx's Add/Edit Landlord modal reads and writes form.iban
-- and form.swift, but no migration in this repo ever added those
-- columns to pm_landlords -- they may have been added manually in
-- Supabase outside of tracked migrations. This is a safe no-op if they
-- already exist (IF NOT EXISTS), and fixes silent save failures if
-- they don't.

ALTER TABLE pm_landlords
  ADD COLUMN IF NOT EXISTS iban TEXT,
  ADD COLUMN IF NOT EXISTS swift TEXT;

NOTIFY pgrst, 'reload schema';
