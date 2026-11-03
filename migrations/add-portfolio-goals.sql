-- Portfolio goals: a client sets a target in plain words; the planner tracks progress and keeps the deal finder pointed at it.
CREATE TABLE IF NOT EXISTS public.portfolio_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  text text NOT NULL,
  target jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  brief_id uuid,
  last_report text,
  last_review timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.portfolio_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own portfolio_goals" ON public.portfolio_goals;
CREATE POLICY "own portfolio_goals" ON public.portfolio_goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.enable_default_ai_agents() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.ai_agents (user_id, agent_key, enabled)
  SELECT NEW.user_id, k, true FROM unnest(ARRAY[
    'chief','guest','cleaning','maintenance','revenue','owner','leads',
    'pm_compliance','pm_renewals','pm_arrears','rent_match','doc_reader',
    'pm_deposits','pm_insurance','pm_inspections','pm_statements',
    'maint_followup','maint_predict','weekly_report','portfolio','market_forecast',
    'ea_viewings','ea_listings','dev_investors',
    'keys_check','head_lease_watch','risk_alerts','hmo_licence','utilities_watch','mortgage_watch','tenant_checks','expense_sorter','invoice_chase','tax_watch','partner_payouts','smart_watch','review_replies','dev_milestones','dev_budget','dev_snags','dev_compliance','dev_safety','hr_watch','applications_watch','team_weekly',
    'deal_screening','deal_finder','goal_planner'
  ]) AS k
  ON CONFLICT (user_id, agent_key) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.enable_default_ai_agents() FROM public, anon, authenticated;

INSERT INTO public.ai_agents (user_id, agent_key, enabled, updated_at)
SELECT s.user_id, 'goal_planner', true, now()
FROM (SELECT DISTINCT user_id FROM public.subscriptions WHERE user_id IS NOT NULL) s
ON CONFLICT (user_id, agent_key) DO UPDATE SET enabled = true, updated_at = now();
