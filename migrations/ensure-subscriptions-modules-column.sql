-- The Sidebar's module-unlock check reads subscriptions.modules, but no
-- webhook code ever wrote to it — every Stripe purchase updated billing
-- status correctly but never actually granted the purchased module(s).
-- Safe to run even if this column already exists correctly.
alter table subscriptions add column if not exists modules text[] default '{}';
