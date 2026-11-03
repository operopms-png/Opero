-- Deal finder: a client types what they want, the AI searches for real listings, and learns from likes and passes.
CREATE TABLE IF NOT EXISTS public.deal_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  text text NOT NULL,
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  last_run timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.deal_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  brief_id uuid REFERENCES public.deal_briefs(id) ON DELETE CASCADE,
  url text NOT NULL,
  title text NOT NULL,
  address text,
  price numeric,
  currency text,
  beds int,
  summary text,
  fit_score int,
  reason text,
  status text NOT NULL DEFAULT 'new',
  feedback_note text,
  deal_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, url)
);
CREATE TABLE IF NOT EXISTS public.deal_learning (
  user_id uuid PRIMARY KEY,
  summary text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deal_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_learning ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own deal_briefs" ON public.deal_briefs;
CREATE POLICY "own deal_briefs" ON public.deal_briefs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own deal_matches" ON public.deal_matches;
CREATE POLICY "own deal_matches" ON public.deal_matches FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own deal_learning" ON public.deal_learning;
CREATE POLICY "own deal_learning" ON public.deal_learning FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS deal_matches_user_status ON public.deal_matches (user_id, status, created_at DESC);

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
    'deal_screening','deal_finder'
  ]) AS k
  ON CONFLICT (user_id, agent_key) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.enable_default_ai_agents() FROM public, anon, authenticated;

INSERT INTO public.ai_agents (user_id, agent_key, enabled, updated_at)
SELECT s.user_id, 'deal_finder', true, now()
FROM (SELECT DISTINCT user_id FROM public.subscriptions WHERE user_id IS NOT NULL) s
ON CONFLICT (user_id, agent_key) DO UPDATE SET enabled = true, updated_at = now();
