-- Five intelligence skills: operations review, tenant watch, cash-flow outlook, development feasibility, document check.
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
    'deal_screening','deal_finder','goal_planner',
    'accounting_export','templates_review','meetings_prep','onboarding_help',
    'ops_intel','tenant_insights','cashflow_forecast','dev_feasibility','doc_intel'
  ]) AS k
  ON CONFLICT (user_id, agent_key) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.enable_default_ai_agents() FROM public, anon, authenticated;

INSERT INTO public.ai_agents (user_id, agent_key, enabled, updated_at)
SELECT s.user_id, k, true, now()
FROM (SELECT DISTINCT user_id FROM public.subscriptions WHERE user_id IS NOT NULL) s
CROSS JOIN unnest(ARRAY['ops_intel','tenant_insights','cashflow_forecast','dev_feasibility','doc_intel']) AS k
ON CONFLICT (user_id, agent_key) DO UPDATE SET enabled = true, updated_at = now();
