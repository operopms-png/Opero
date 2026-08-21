-- Adds sale-listing support to estate_properties. Previously this table only
-- modeled lettings (rent + Available/Rented/Maintenance/Archived status).
-- This adds a listing_type so a property can be marked For Rent, For Sale,
-- or Both, plus a sale_price for the sale side.
alter table estate_properties
  add column if not exists listing_type text not null default 'Rent'
    check (listing_type in ('Rent', 'Sale', 'Both')),
  add column if not exists sale_price numeric;

-- Reload PostgREST's schema cache so the new columns are usable immediately
-- without waiting for the next auto-refresh.
notify pgrst, 'reload schema';
