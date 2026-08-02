-- The dashboard was reconstructing "days left in trial" from updated_at,
-- which gets rewritten by every unrelated Stripe webhook event during the
-- trial (price syncs, metadata updates, etc), silently pushing the
-- displayed countdown forward each time. This stores Stripe's actual
-- trial_end so the countdown is accurate and stable.
alter table subscriptions add column if not exists trial_end timestamptz;
