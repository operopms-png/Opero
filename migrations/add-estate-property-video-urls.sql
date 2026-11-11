-- Virtual viewing videos on a listing: JSON array of {url,title}.
ALTER TABLE estate_properties ADD COLUMN IF NOT EXISTS video_urls TEXT;
