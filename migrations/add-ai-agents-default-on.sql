-- New subscribers get every AI agent switched on. Agents only draft into the
-- approvals queue; nothing is sent or changed until a person approves it.
CREATE OR REPLACE FUNCTION public.enable_default_ai_agents() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.ai_agents (user_id, agent_key, enabled)
  SELECT NEW.user_id, k, true FROM unnest(ARRAY[
    'chief','guest','cleaning','maintenance','revenue','owner','leads',
    'pm_compliance','pm_renewals','pm_arrears','rent_match','doc_reader',
    'pm_deposits','pm_insurance','pm_inspections','pm_statements',
    'maint_followup','weekly_report','portfolio','ea_viewings','ea_listings','dev_investors'
  ]) AS k
  ON CONFLICT (user_id, agent_key) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enable_default_ai_agents ON public.subscriptions;
CREATE TRIGGER trg_enable_default_ai_agents
  AFTER INSERT ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.enable_default_ai_agents();
