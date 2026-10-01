-- Website (sangstersgroup.com) fields for Estate Agency properties; the public
-- feed /api/public/portfolio serves properties with show_on_website = true.
alter table public.estate_properties
  add column if not exists web_title text,
  add column if not exists web_area text,
  add column if not exists country text,
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists guests integer,
  add column if not exists airbnb_url text,
  add column if not exists web_badge text,
  add column if not exists web_sort integer default 0;
