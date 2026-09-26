-- Already applied to project mzjsxrlgnthelwwtfkke (kept for the record).
-- bookings / maintenance_tickets were only visible to the business owner's own
-- login. Now: team members (not Partners) get full access to their business's
-- records; investors can VIEW (not change) records on their own linked properties.

DROP POLICY IF EXISTS "Team manages business bookings" ON bookings;
CREATE POLICY "Team manages business bookings" ON bookings FOR ALL
  USING (EXISTS (SELECT 1 FROM properties p WHERE p.id = bookings.property_id AND is_owner_staff(p.user_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM properties p WHERE p.id = bookings.property_id AND is_owner_staff(p.user_id)));

DROP POLICY IF EXISTS "Team manages business maintenance tickets" ON maintenance_tickets;
CREATE POLICY "Team manages business maintenance tickets" ON maintenance_tickets FOR ALL
  USING (EXISTS (SELECT 1 FROM properties p WHERE p.id = maintenance_tickets.property_id AND is_owner_staff(p.user_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM properties p WHERE p.id = maintenance_tickets.property_id AND is_owner_staff(p.user_id)));

DROP POLICY IF EXISTS "Investors view own property bookings" ON bookings;
CREATE POLICY "Investors view own property bookings" ON bookings FOR SELECT
  USING (EXISTS (SELECT 1 FROM owner_profiles o WHERE o.user_id = auth.uid() AND bookings.property_id = ANY(o.property_ids)));

DROP POLICY IF EXISTS "Investors view own property tickets" ON maintenance_tickets;
CREATE POLICY "Investors view own property tickets" ON maintenance_tickets FOR SELECT
  USING (EXISTS (SELECT 1 FROM owner_profiles o WHERE o.user_id = auth.uid() AND maintenance_tickets.property_id = ANY(o.property_ids)));

NOTIFY pgrst, 'reload schema';
