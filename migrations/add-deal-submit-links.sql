-- Agent deal link: each client gets a public link where local agents and partners submit deals into the pipeline.
CREATE TABLE IF NOT EXISTS public.deal_submit_links (
  user_id uuid PRIMARY KEY,
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deal_submit_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own deal_submit_links" ON public.deal_submit_links;
CREATE POLICY "own deal_submit_links" ON public.deal_submit_links FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
