-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Only a review-REQUEST email template existed (guest_comm_templates
-- with key='review') -- no actual tracking of reviews received: no
-- ratings log, nothing to flag a bad review needing a response.

CREATE TABLE IF NOT EXISTS str_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  guest_name TEXT,
  platform TEXT NOT NULL DEFAULT 'Airbnb', -- Airbnb/Booking.com/VRBO/Direct/Other
  rating NUMERIC, -- out of 5
  review_text TEXT,
  review_date DATE,
  response_text TEXT,
  responded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_str_reviews_user_id ON str_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_str_reviews_property_id ON str_reviews(property_id);

ALTER TABLE str_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner manages own str reviews" ON str_reviews;
CREATE POLICY "owner manages own str reviews" ON str_reviews
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
