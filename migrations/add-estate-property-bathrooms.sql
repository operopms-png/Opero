-- Adds bathrooms to estate_properties. Units already had a bathrooms field
-- (estate_units), but the top-level property record never did.
alter table estate_properties
  add column if not exists bathrooms text;

notify pgrst, 'reload schema';
