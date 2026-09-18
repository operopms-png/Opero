-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- People & HR for Staff Centre. Not tied to any single module's own
-- team_members table (those differ per module and are about module
-- access, not employment records) -- hr_employees is the shared "who"
-- every other HR table hangs off.

CREATE TABLE IF NOT EXISTS hr_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'Full-Time'; -- Full-Time/Part-Time/Contractor
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active'; -- Active/On Leave/Terminated
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS salary NUMERIC;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS hr_onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE hr_onboarding_tasks ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL;
ALTER TABLE hr_onboarding_tasks ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES hr_employees(id) ON DELETE CASCADE;
ALTER TABLE hr_onboarding_tasks ADD COLUMN IF NOT EXISTS task TEXT NOT NULL;
ALTER TABLE hr_onboarding_tasks ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Pending'; -- Pending/Complete
ALTER TABLE hr_onboarding_tasks ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE hr_onboarding_tasks ADD COLUMN IF NOT EXISTS completed_date DATE;
ALTER TABLE hr_onboarding_tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS hr_performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE hr_performance_reviews ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL;
ALTER TABLE hr_performance_reviews ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES hr_employees(id) ON DELETE CASCADE;
ALTER TABLE hr_performance_reviews ADD COLUMN IF NOT EXISTS review_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE hr_performance_reviews ADD COLUMN IF NOT EXISTS reviewer TEXT;
ALTER TABLE hr_performance_reviews ADD COLUMN IF NOT EXISTS rating NUMERIC; -- out of 5
ALTER TABLE hr_performance_reviews ADD COLUMN IF NOT EXISTS strengths TEXT;
ALTER TABLE hr_performance_reviews ADD COLUMN IF NOT EXISTS improvements TEXT;
ALTER TABLE hr_performance_reviews ADD COLUMN IF NOT EXISTS goals TEXT;
ALTER TABLE hr_performance_reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS hr_training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE hr_training_records ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL;
ALTER TABLE hr_training_records ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES hr_employees(id) ON DELETE CASCADE;
ALTER TABLE hr_training_records ADD COLUMN IF NOT EXISTS training_name TEXT NOT NULL;
ALTER TABLE hr_training_records ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE hr_training_records ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Scheduled'; -- Scheduled/Completed/Expired
ALTER TABLE hr_training_records ADD COLUMN IF NOT EXISTS completed_date DATE;
ALTER TABLE hr_training_records ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE hr_training_records ADD COLUMN IF NOT EXISTS certificate_url TEXT;
ALTER TABLE hr_training_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS hr_discipline_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE hr_discipline_records ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL;
ALTER TABLE hr_discipline_records ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES hr_employees(id) ON DELETE CASCADE;
ALTER TABLE hr_discipline_records ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'Verbal Warning'; -- Verbal Warning/Written Warning/Final Warning/Performance Improvement Plan/Other
ALTER TABLE hr_discipline_records ADD COLUMN IF NOT EXISTS date_issued DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE hr_discipline_records ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE hr_discipline_records ADD COLUMN IF NOT EXISTS issued_by TEXT;
ALTER TABLE hr_discipline_records ADD COLUMN IF NOT EXISTS resolution TEXT;
ALTER TABLE hr_discipline_records ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE hr_discipline_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS hr_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE hr_time_entries ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL;
ALTER TABLE hr_time_entries ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES hr_employees(id) ON DELETE CASCADE;
ALTER TABLE hr_time_entries ADD COLUMN IF NOT EXISTS entry_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE hr_time_entries ADD COLUMN IF NOT EXISTS clock_in TEXT; -- stored as HH:MM, avoids timezone edge cases for a simple log
ALTER TABLE hr_time_entries ADD COLUMN IF NOT EXISTS clock_out TEXT;
ALTER TABLE hr_time_entries ADD COLUMN IF NOT EXISTS hours NUMERIC;
ALTER TABLE hr_time_entries ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE hr_time_entries ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS hr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE hr_requests ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL;
ALTER TABLE hr_requests ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES hr_employees(id) ON DELETE CASCADE;
ALTER TABLE hr_requests ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'Holiday'; -- Holiday/Sick Leave/Expense/General
ALTER TABLE hr_requests ADD COLUMN IF NOT EXISTS title TEXT NOT NULL;
ALTER TABLE hr_requests ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE hr_requests ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Pending'; -- Pending/Approved/Denied
ALTER TABLE hr_requests ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE hr_requests ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE hr_requests ADD COLUMN IF NOT EXISTS resolved_by TEXT;
ALTER TABLE hr_requests ADD COLUMN IF NOT EXISTS resolved_date DATE;
ALTER TABLE hr_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS hr_company_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE hr_company_goals ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL;
ALTER TABLE hr_company_goals ADD COLUMN IF NOT EXISTS title TEXT NOT NULL;
ALTER TABLE hr_company_goals ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE hr_company_goals ADD COLUMN IF NOT EXISTS owner_employee_id UUID REFERENCES hr_employees(id) ON DELETE SET NULL;
ALTER TABLE hr_company_goals ADD COLUMN IF NOT EXISTS target_date DATE;
ALTER TABLE hr_company_goals ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Not Started'; -- Not Started/In Progress/Achieved/Missed
ALTER TABLE hr_company_goals ADD COLUMN IF NOT EXISTS progress_pct NUMERIC DEFAULT 0;
ALTER TABLE hr_company_goals ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_hr_employees_user_id ON hr_employees(user_id);
CREATE INDEX IF NOT EXISTS idx_hr_onboarding_employee_id ON hr_onboarding_tasks(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_performance_employee_id ON hr_performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_training_employee_id ON hr_training_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_discipline_employee_id ON hr_discipline_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_time_entries_employee_id ON hr_time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_requests_employee_id ON hr_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_company_goals_user_id ON hr_company_goals(user_id);

ALTER TABLE hr_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_discipline_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_company_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner manages own hr employees" ON hr_employees;
CREATE POLICY "owner manages own hr employees" ON hr_employees FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "owner manages own hr onboarding" ON hr_onboarding_tasks;
CREATE POLICY "owner manages own hr onboarding" ON hr_onboarding_tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "owner manages own hr performance" ON hr_performance_reviews;
CREATE POLICY "owner manages own hr performance" ON hr_performance_reviews FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "owner manages own hr training" ON hr_training_records;
CREATE POLICY "owner manages own hr training" ON hr_training_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "owner manages own hr discipline" ON hr_discipline_records;
CREATE POLICY "owner manages own hr discipline" ON hr_discipline_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "owner manages own hr time entries" ON hr_time_entries;
CREATE POLICY "owner manages own hr time entries" ON hr_time_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "owner manages own hr requests" ON hr_requests;
CREATE POLICY "owner manages own hr requests" ON hr_requests FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "owner manages own hr company goals" ON hr_company_goals;
CREATE POLICY "owner manages own hr company goals" ON hr_company_goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
