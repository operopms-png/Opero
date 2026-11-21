-- A listed property can carry its own floor plan and 3D room layout (for houses and other properties with no flats).
ALTER TABLE estate_properties ADD COLUMN IF NOT EXISTS plan_url TEXT;
ALTER TABLE estate_properties ADD COLUMN IF NOT EXISTS layout JSONB;
