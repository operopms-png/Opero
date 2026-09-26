-- Already applied to project mzjsxrlgnthelwwtfkke (kept for the record).
--
-- SECURITY FIX:
--  * properties had an "Allow all" policy (ALL, true, public) — anyone with
--    the public site key, even logged out, could read/edit/delete every
--    property (addresses, purchase prices, wifi passwords, check-in details).
--  * estate_expenses had the same open policy.
-- The public booking page (/book/[slug]) now reads through a function that
-- returns only the fields it shows, plus booked dates.

CREATE OR REPLACE FUNCTION public_property_by_slug(p_slug TEXT)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'property', json_build_object(
      'id', p.id, 'name', p.name, 'location', p.location, 'description', p.description,
      'image_url', p.image_url, 'bedrooms', p.bedrooms, 'bathrooms', p.bathrooms,
      'max_guests', p.max_guests, 'nightly_rate', p.nightly_rate, 'cleaning_fee', p.cleaning_fee
    ),
    'booked', COALESCE((
      SELECT json_agg(json_build_object('start', r.check_in, 'end', r.check_out))
      FROM (
        SELECT d.check_in, d.check_out FROM direct_bookings d
        WHERE d.property_id = p.id AND d.status = 'confirmed' AND d.check_out >= CURRENT_DATE
        UNION ALL
        SELECT b.check_in::date, b.check_out::date FROM bookings b
        WHERE b.property_id = p.id AND COALESCE(b.status, '') <> 'cancelled' AND b.check_out::date >= CURRENT_DATE
      ) r
    ), '[]'::json)
  )
  FROM properties p
  WHERE p.slug = p_slug AND p.is_bookable IS DISTINCT FROM false
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public_property_by_slug(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public_property_by_slug(TEXT) TO anon, authenticated;

-- Investors can read the properties they're linked to
DROP POLICY IF EXISTS "Owners read their properties" ON properties;
CREATE POLICY "Owners read their properties" ON properties FOR SELECT
  USING (EXISTS (SELECT 1 FROM owner_profiles o WHERE o.user_id = auth.uid() AND properties.id = ANY(o.property_ids)));

-- Remove the open policy (business + team policies remain)
DROP POLICY IF EXISTS "Allow all" ON properties;

-- estate_expenses: business and its staff only
DROP POLICY IF EXISTS estate_expenses_all ON estate_expenses;
DROP POLICY IF EXISTS "business manages estate expenses" ON estate_expenses;
CREATE POLICY "business manages estate expenses" ON estate_expenses FOR ALL
  USING (auth.uid() = user_id OR user_id IN (SELECT tm.user_id FROM team_members tm WHERE tm.email = (auth.jwt() ->> 'email')))
  WITH CHECK (auth.uid() = user_id OR user_id IN (SELECT tm.user_id FROM team_members tm WHERE tm.email = (auth.jwt() ->> 'email')));

NOTIFY pgrst, 'reload schema';
