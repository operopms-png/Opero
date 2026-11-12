-- Open roles shown on the public careers page (app/careers/[token]). Service role only (RLS on, no policies).
CREATE TABLE IF NOT EXISTS public.job_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  job_type text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS job_roles_business_idx ON public.job_roles (business_id);
ALTER TABLE public.job_roles ENABLE ROW LEVEL SECURITY;
