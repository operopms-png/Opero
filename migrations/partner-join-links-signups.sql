-- Already applied to project mzjsxrlgnthelwwtfkke (kept for the record).
-- Public partner sign-up links (helloopero.com/join/<slug>) and pending sign-ups.

CREATE TABLE IF NOT EXISTS partner_join_links (
  business_id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  headline TEXT,
  blurb TEXT,
  fee_gbp NUMERIC NOT NULL DEFAULT 75,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE partner_join_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff manage join link" ON partner_join_links;
CREATE POLICY "staff manage join link" ON partner_join_links FOR ALL
  USING (is_owner_staff(business_id)) WITH CHECK (is_owner_staff(business_id));

-- Sign-ups waiting for payment. Written only by the server (service role).
CREATE TABLE IF NOT EXISTS partner_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  user_id UUID NOT NULL,
  name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | paid
  stripe_session_id TEXT,
  owner_profile_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_partner_signups_email ON partner_signups(lower(email));
ALTER TABLE partner_signups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff view signups" ON partner_signups;
CREATE POLICY "staff view signups" ON partner_signups FOR SELECT USING (is_owner_staff(business_id));

-- What the public sign-up page may see: text and fee only
CREATE OR REPLACE FUNCTION public_join_link(p_slug TEXT)
RETURNS JSON LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT json_build_object('slug', l.slug, 'headline', l.headline, 'blurb', l.blurb, 'fee_gbp', l.fee_gbp)
  FROM partner_join_links l WHERE l.slug = lower(p_slug) AND l.active LIMIT 1
$$;
REVOKE ALL ON FUNCTION public_join_link(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public_join_link(TEXT) TO anon, authenticated;

-- Seed the link for the business the existing investors belong to
INSERT INTO partner_join_links (business_id, slug, headline, blurb)
SELECT DISTINCT business_id, 'sangsters',
  'Invest in Jamaican rentals with Sangsters Group',
  'Join as a partner to back furnished homes and HMOs we run under sublease, track your investment, and hear about new opportunities first.'
FROM owner_profiles WHERE business_id IS NOT NULL
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
