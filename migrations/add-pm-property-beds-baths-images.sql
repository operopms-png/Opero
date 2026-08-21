-- Adds bedrooms, bathrooms, and photos to pm_properties, matching what
-- Estate Agency's estate_properties already has.
alter table pm_properties
  add column if not exists bedrooms text,
  add column if not exists bathrooms text,
  add column if not exists image_urls text;

notify pgrst, 'reload schema';
