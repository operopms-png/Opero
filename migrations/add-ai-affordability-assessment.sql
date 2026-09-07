-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Stores the AI-generated affordability opinion for a bank statement
-- check -- advisory only, staff still set the actual Status
-- themselves. Generated from the objective financial fields already
-- on this table (income, rent, red flags, notes) -- never from the
-- tenant's name or any personal/identity data, to keep the assessment
-- purely financial.

ALTER TABLE estate_bank_statement_checks
  ADD COLUMN IF NOT EXISTS ai_assessment TEXT,
  ADD COLUMN IF NOT EXISTS ai_assessment_generated_at TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';
