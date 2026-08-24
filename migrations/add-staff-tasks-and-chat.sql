-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- STAFF TASKS -- Admin assigns/manages in Settings -> Team Management
-- -> Tasks; each staff member sees their own on their staff dashboard.

CREATE TABLE IF NOT EXISTS staff_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  assigned_to UUID REFERENCES team_members(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'On track', -- 'On track' | 'At risk' | 'Off track' | 'Done'
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_tasks_user_id ON staff_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_assigned_to ON staff_tasks(assigned_to);

ALTER TABLE staff_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner manages own staff tasks" ON staff_tasks;
CREATE POLICY "owner manages own staff tasks" ON staff_tasks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Staff can see and update (status only, in practice) their own
-- assigned tasks -- same email-matching pattern as staff_shifts.
DROP POLICY IF EXISTS "staff reads own tasks" ON staff_tasks;
CREATE POLICY "staff reads own tasks" ON staff_tasks
  FOR SELECT USING (assigned_to IN (SELECT id FROM team_members WHERE email = (auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "staff updates own task status" ON staff_tasks;
CREATE POLICY "staff updates own task status" ON staff_tasks
  FOR UPDATE USING (assigned_to IN (SELECT id FROM team_members WHERE email = (auth.jwt() ->> 'email')))
  WITH CHECK (assigned_to IN (SELECT id FROM team_members WHERE email = (auth.jwt() ->> 'email')));

NOTIFY pgrst, 'reload schema';

-- STAFF CHAT -- group conversations between the business owner and
-- their staff. Sender/member identity is stored as plain email+name
-- rather than a strict foreign key, because the business owner
-- (Admin) has no team_members row of their own -- they authenticate
-- directly, staff authenticate via a team_members row matched by
-- email. Denormalizing here avoids needing to unify those two
-- identity shapes into one FK-able table.

CREATE TABLE IF NOT EXISTS staff_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- which business this conversation belongs to
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES staff_conversations(id) ON DELETE CASCADE,
  member_email TEXT NOT NULL,
  member_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS staff_conversation_members_unique ON staff_conversation_members(conversation_id, member_email);

CREATE TABLE IF NOT EXISTS staff_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES staff_conversations(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_messages_conversation_id ON staff_messages(conversation_id);

ALTER TABLE staff_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner manages own conversations" ON staff_conversations;
CREATE POLICY "owner manages own conversations" ON staff_conversations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "members read own conversations" ON staff_conversations;
CREATE POLICY "members read own conversations" ON staff_conversations
  FOR SELECT USING (id IN (SELECT conversation_id FROM staff_conversation_members WHERE member_email = (auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "owner manages own conversation members" ON staff_conversation_members;
CREATE POLICY "owner manages own conversation members" ON staff_conversation_members
  FOR ALL USING (conversation_id IN (SELECT id FROM staff_conversations WHERE user_id = auth.uid()))
  WITH CHECK (conversation_id IN (SELECT id FROM staff_conversations WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "members read own membership rows" ON staff_conversation_members;
CREATE POLICY "members read own membership rows" ON staff_conversation_members
  FOR SELECT USING (conversation_id IN (SELECT conversation_id FROM staff_conversation_members WHERE member_email = (auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "owner manages own messages" ON staff_messages;
CREATE POLICY "owner manages own messages" ON staff_messages
  FOR ALL USING (conversation_id IN (SELECT id FROM staff_conversations WHERE user_id = auth.uid()))
  WITH CHECK (conversation_id IN (SELECT id FROM staff_conversations WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "members read own conversation messages" ON staff_messages;
CREATE POLICY "members read own conversation messages" ON staff_messages
  FOR SELECT USING (conversation_id IN (SELECT conversation_id FROM staff_conversation_members WHERE member_email = (auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "members send messages" ON staff_messages;
CREATE POLICY "members send messages" ON staff_messages
  FOR INSERT WITH CHECK (conversation_id IN (SELECT conversation_id FROM staff_conversation_members WHERE member_email = (auth.jwt() ->> 'email')));

-- Enables live message delivery (Supabase Realtime) -- without this,
-- the chat would only update on refresh, not live as messages arrive.
ALTER PUBLICATION supabase_realtime ADD TABLE staff_messages;

NOTIFY pgrst, 'reload schema';
