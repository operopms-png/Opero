-- Run in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke).
-- Shared approvals queue: every AI agent proposes an action here instead of
-- acting directly. Staff approve (optionally editing the draft) or reject.
-- Each row doubles as the audit log: who proposed, who decided, when it ran,
-- and what went out.

CREATE TABLE IF NOT EXISTS ai_pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                       -- business account that owns the action
  agent_key TEXT NOT NULL,                     -- 'guest', 'cleaning', 'maintenance', ...
  action_type TEXT NOT NULL,                   -- 'guest_reply' (more types added per agent)
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','executed','failed')),
  title TEXT NOT NULL,                         -- short line shown in the queue
  property_name TEXT,
  draft_body TEXT NOT NULL,                    -- what the AI wrote
  final_body TEXT,                             -- what staff approved (may be edited)
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,  -- inputs needed to execute (e.g. booking_id)
  context JSONB NOT NULL DEFAULT '{}'::jsonb,  -- what triggered it (e.g. the guest message)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_by UUID,
  decided_by_name TEXT,
  decided_at TIMESTAMPTZ,
  decision_note TEXT,
  executed_at TIMESTAMPTZ,
  error TEXT
);

CREATE INDEX IF NOT EXISTS ai_pending_actions_user_status_idx ON ai_pending_actions (user_id, status, created_at DESC);

ALTER TABLE ai_pending_actions ENABLE ROW LEVEL SECURITY;

-- Business owner can read their own queue directly; all writes go through the
-- API routes (service role) so staff decisions are always attributed.
DROP POLICY IF EXISTS "Users read own ai_pending_actions" ON ai_pending_actions;
CREATE POLICY "Users read own ai_pending_actions" ON ai_pending_actions FOR SELECT USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
