-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Backs the new "Book a demo" form on the public landing page
-- (public/landing.html). Public-facing form, no logged-in user, so
-- this table isn't scoped by user_id like everything else -- it's
-- Sangsters' own incoming lead list.

CREATE TABLE IF NOT EXISTS demo_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  portfolio_type TEXT,
  status TEXT NOT NULL DEFAULT 'New',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demo_requests_created_at ON demo_requests(created_at);

ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;

-- No public SELECT/UPDATE/DELETE policy -- this table is only ever
-- written to via the service-role API route (app/api/demo-request),
-- and only ever read by Sangsters staff directly in Supabase for now.

NOTIFY pgrst, 'reload schema';
