-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- Invest module's Saved Deals and Watchlist were pure local React state
-- with no database behind them at all — everything vanished on refresh.

CREATE TABLE IF NOT EXISTS investment_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  strategy TEXT NOT NULL,
  address TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS investment_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  address TEXT NOT NULL,
  price TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Watching',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE investment_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_watchlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own investment_deals" ON investment_deals;
CREATE POLICY "Users manage own investment_deals" ON investment_deals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own investment_watchlist" ON investment_watchlist;
CREATE POLICY "Users manage own investment_watchlist" ON investment_watchlist FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
