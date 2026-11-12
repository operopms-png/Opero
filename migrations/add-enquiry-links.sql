-- One public enquiry-form link per company (app/enquire/[token]). Read and written only through
-- the service role (RLS on, no policies). Leads go to that company's own CRM.
CREATE TABLE IF NOT EXISTS public.enquiry_links (
  business_id uuid PRIMARY KEY,
  token text NOT NULL UNIQUE DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.enquiry_links ENABLE ROW LEVEL SECURITY;
