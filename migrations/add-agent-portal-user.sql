-- Agents sign in to their own portal (app/agent-portal). The login is linked to the agent record.
ALTER TABLE public.partner_agents ADD COLUMN IF NOT EXISTS portal_user_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_agents_portal_user ON public.partner_agents (portal_user_id) WHERE portal_user_id IS NOT NULL;
NOTIFY pgrst, 'reload schema';
