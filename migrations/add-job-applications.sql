-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Staff Centre -> Applications: a real job-applicant tracker. New
-- feature, not a repurposing of anything that exists.

CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  candidate_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role_applied TEXT NOT NULL,
  module TEXT, -- which part of the business the role is for, optional
  stage TEXT NOT NULL DEFAULT 'Applied', -- Applied/Interviewing/Offered/Hired/Rejected
  resume_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_applications_user_id ON job_applications(user_id);

ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner manages own job applications" ON job_applications;
CREATE POLICY "owner manages own job applications" ON job_applications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
