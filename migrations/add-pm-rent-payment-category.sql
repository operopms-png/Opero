-- Distinguishes rent vs utility charges so tenants can pay either from
-- their portal. Existing rows default to 'Rent' (the only kind that
-- existed before this).
alter table pm_rent_payments
  add column if not exists category text not null default 'Rent'
    check (category in ('Rent', 'Utilities', 'Other'));

notify pgrst, 'reload schema';
