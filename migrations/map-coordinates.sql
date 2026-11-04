-- Map: saved coordinates so addresses are looked up once, not on every page load.
alter table pm_properties add column if not exists lat double precision, add column if not exists lng double precision, add column if not exists geocoded_at timestamptz;
alter table properties add column if not exists lat double precision, add column if not exists lng double precision, add column if not exists geocoded_at timestamptz;
alter table estate_properties add column if not exists geocoded_at timestamptz;
alter table deal_matches add column if not exists lat double precision, add column if not exists lng double precision, add column if not exists geocoded_at timestamptz;
