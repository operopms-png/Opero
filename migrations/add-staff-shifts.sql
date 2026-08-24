-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Staff Schedule: Admins set shifts per staff member in
-- Settings -> Team Management -> Schedule; each staff member sees
-- their own upcoming week on their staff dashboard.

CREATE TABLE IF NOT EXISTS staff_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  staff_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'Working', -- 'Working' | 'Leave' | 'Off'
  start_time TIME,
  end_time TIME,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One entry per staff member per day -- setting a new shift for a day
-- that already has one should update it, not create a duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS staff_shifts_staff_date_idx ON staff_shifts(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_user_id ON staff_shifts(user_id);

ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner manages own staff shifts" ON staff_shifts;
CREATE POLICY "owner manages own staff shifts" ON staff_shifts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- team_members links to a login by email (not a stored auth user id),
-- so a staff member's own shifts are matched via their JWT's email
-- claim against team_members.email -- same pattern the rest of the app
-- already uses for staff/role lookups.
DROP POLICY IF EXISTS "staff reads own shifts" ON staff_shifts;
CREATE POLICY "staff reads own shifts" ON staff_shifts
  FOR SELECT USING (staff_id IN (SELECT id FROM team_members WHERE email = (auth.jwt() ->> 'email')));

NOTIFY pgrst, 'reload schema';
