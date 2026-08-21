-- Adds multiple photos to estate_properties. Stored as a JSON-stringified
-- array in a text column, same pattern as STR's before_media/after_media
-- fields, so a property can have a full photo set instead of just one image.
alter table estate_properties
  add column if not exists image_urls text;

notify pgrst, 'reload schema';
