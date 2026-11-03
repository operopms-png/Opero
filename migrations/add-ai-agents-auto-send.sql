-- Each skill can send its own messages without waiting for approval (on by default; switch off per skill).
-- Only message-type actions are ever auto-sent: emails, guest and portal replies, owner reports, cleaning and
-- maintenance instructions. Price changes, rent matching, lease and listing edits still wait for a person.
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS auto_send boolean NOT NULL DEFAULT true;
UPDATE public.ai_agents SET auto_send = true;
NOTIFY pgrst, 'reload schema';
UPDATE public.ai_agents SET auto_send = false WHERE agent_key IN ('pm_renewals','doc_reader'); -- renewal offers and lease changes are legal contracts: a person approves
