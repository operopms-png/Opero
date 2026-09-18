-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Staff Performance scoreboard for Staff Centre -- tracks real wins
-- across categories that span all 4 modules (a closed deal, a client
-- onboarded, a joint venture, an investor secured, a tenant placed in
-- a vacant property), not tied to any one module's own team_members
-- table since those differ per module and this is meant to be a
-- shared, cross-module view.

CREATE TABLE IF NOT EXISTS staff_performance_wins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE staff_performance_wins ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL;
ALTER TABLE staff_performance_wins ADD COLUMN IF NOT EXISTS staff_name TEXT NOT NULL;
ALTER TABLE staff_performance_wins ADD COLUMN IF NOT EXISTS category TEXT NOT NULL; -- Deal Closed / Client Onboarded (Short-Term) / Client Onboarded (Long-Term) / Joint Venture Secured / Investor Secured / Tenant Secured
ALTER TABLE staff_performance_wins ADD COLUMN IF NOT EXISTS title TEXT NOT NULL;
ALTER TABLE staff_performance_wins ADD COLUMN IF NOT EXISTS value NUMERIC; -- £ value where relevant (deal size, investment amount, annual rent secured) -- optional, not every win has a clean number
ALTER TABLE staff_performance_wins ADD COLUMN IF NOT EXISTS module TEXT; -- str/pm/estate/dev, optional
ALTER TABLE staff_performance_wins ADD COLUMN IF NOT EXISTS date_achieved DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE staff_performance_wins ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE staff_performance_wins ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_staff_performance_wins_user_id ON staff_performance_wins(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_performance_wins_date ON staff_performance_wins(date_achieved);

ALTER TABLE staff_performance_wins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner manages own staff performance wins" ON staff_performance_wins;
CREATE POLICY "owner manages own staff performance wins" ON staff_performance_wins
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
