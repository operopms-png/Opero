-- Lets each Opero business connect their own Stripe account, so tenant
-- rent/utility payments (via Pay Now in the tenant portal) route to THEM,
-- not to Opero's own platform Stripe account. Before this, every tenant
-- payment landed in Opero's own balance regardless of which business
-- managed that tenant — fine for a single early customer testing it, but
-- not workable (or legal, re: client money) once more than one business
-- uses this feature.
alter table subscriptions
  add column if not exists stripe_connect_account_id text,
  add column if not exists stripe_connect_onboarded boolean not null default false;

notify pgrst, 'reload schema';
