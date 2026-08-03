-- Temporary diagnostic table. The stripe-webhook has silently failed to
-- create subscription rows multiple times with no visible error (Stripe
-- shows 200 OK regardless), so this logs each meaningful step so we can
-- see exactly where it's actually failing instead of guessing further.
-- Safe to drop once the real cause is found and fixed.
create table if not exists webhook_debug_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  step text not null,
  detail jsonb
);
