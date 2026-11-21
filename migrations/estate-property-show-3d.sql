-- Public listing page: show the 3D walk-through of flats that have saved rooms. On by default; a company can switch it off per property.
ALTER TABLE estate_properties ADD COLUMN IF NOT EXISTS show_3d BOOLEAN NOT NULL DEFAULT true;
