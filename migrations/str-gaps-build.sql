-- Vacation Rentals gaps (applied via Supabase; same RLS pattern as dev-gaps-build.sql): property amenities/onboarding, contractor rating,
-- str_guests, str_requests, str_inventory, str_laundry, str_inspections, str_pricing_rules, str_owner_agreements, str_booking_changes
alter table properties add column if not exists amenities text;
alter table properties add column if not exists onboarding jsonb not null default '{}'::jsonb;
alter table vendor_contractors add column if not exists rating numeric;
-- (table definitions as applied in the Supabase migration str_gaps_build)
