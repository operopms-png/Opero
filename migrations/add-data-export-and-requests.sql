-- Data export and deletion requests (GDPR-style rights).
-- export_business_data: everything stored under one business account, as JSON, with secrets stripped. Service role only.
CREATE OR REPLACE FUNCTION public.export_business_data(p_biz uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record; out jsonb := '{}'::jsonb; rows jsonb; cond text;
  skip text[] := ARRAY['mailboxes','mailbox_messages','smart_connections','sms_connections','smart_otps','app_otps','webhook_debug_log','ai_staff_secret_log','ai_push_subscriptions','subscriptions'];
BEGIN
  FOR r IN
    SELECT c.table_name, string_agg(format('t.%I = %L', c.column_name, p_biz), ' OR ') AS cond
    FROM information_schema.columns c
    JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public' AND c.column_name IN ('user_id', 'business_id') AND c.data_type = 'uuid' AND NOT (c.table_name = ANY (skip))
    GROUP BY c.table_name ORDER BY c.table_name
  LOOP
    EXECUTE format(
      'SELECT coalesce(jsonb_agg(x), ''[]''::jsonb) FROM (SELECT (SELECT jsonb_object_agg(e.key, e.value) FROM jsonb_each(to_jsonb(t)) e WHERE e.key !~* %L) AS x FROM public.%I t WHERE %s LIMIT 5000) s',
      '(password|secret|token|api_key|encrypted|otp|credential)', r.table_name, r.cond) INTO rows;
    IF rows <> '[]'::jsonb THEN out := out || jsonb_build_object(r.table_name, rows); END IF;
  END LOOP;
  RETURN out;
END $$;
REVOKE EXECUTE ON FUNCTION public.export_business_data(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.export_business_data(uuid) TO service_role;

CREATE TABLE IF NOT EXISTS public.data_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  requested_by uuid,
  requester_email text,
  kind text NOT NULL CHECK (kind IN ('export', 'delete')),
  note text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.data_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own data_requests" ON public.data_requests;
CREATE POLICY "own data_requests" ON public.data_requests FOR SELECT USING (auth.uid() = business_id);
