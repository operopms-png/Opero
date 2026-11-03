-- Settings -> Submissions: clients report issues and bugs, leave reviews and suggestions. Server-only table (no public policies).
CREATE TABLE IF NOT EXISTS public.client_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  user_id uuid,
  user_name text,
  user_email text,
  kind text NOT NULL CHECK (kind IN ('issue','review','suggestion')),
  title text NOT NULL,
  body text,
  rating int CHECK (rating BETWEEN 1 AND 5),
  status text NOT NULL DEFAULT 'received',
  reply text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS client_submissions_business_idx ON public.client_submissions (business_id, created_at DESC);
ALTER TABLE public.client_submissions ENABLE ROW LEVEL SECURITY;
NOTIFY pgrst, 'reload schema';
