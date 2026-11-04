-- Floor plan image and 3D room layout per flat.
alter table pm_units add column if not exists plan_url text, add column if not exists layout jsonb;
alter table estate_units add column if not exists plan_url text, add column if not exists layout jsonb;
