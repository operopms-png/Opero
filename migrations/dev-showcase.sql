-- Development projects on the map, and floor plan / 3D layout per development unit.
alter table dev_projects add column if not exists lat double precision, add column if not exists lng double precision, add column if not exists geocoded_at timestamptz;
alter table dev_units add column if not exists floor integer, add column if not exists plan_url text, add column if not exists layout jsonb;
