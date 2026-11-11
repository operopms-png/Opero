-- Pictures and videos attached to a portal guide (Staff Training > Portal guides).
CREATE TABLE IF NOT EXISTS tab_guide_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tab_key TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('image','video')),
  url TEXT NOT NULL,
  caption TEXT,
  created_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tab_guide_media_key ON tab_guide_media (user_id, tab_key);
ALTER TABLE tab_guide_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tab_guide_media_owner_only ON tab_guide_media;
CREATE POLICY tab_guide_media_owner_only ON tab_guide_media FOR ALL
  USING ((auth.uid() = user_id) OR (user_id IN (SELECT tm.user_id FROM team_members tm WHERE tm.email = (auth.jwt() ->> 'email'))))
  WITH CHECK ((auth.uid() = user_id) OR (user_id IN (SELECT tm.user_id FROM team_members tm WHERE tm.email = (auth.jwt() ->> 'email'))));
DROP POLICY IF EXISTS view_only_ins ON tab_guide_media; CREATE POLICY view_only_ins ON tab_guide_media AS RESTRICTIVE FOR INSERT WITH CHECK (NOT is_view_only());
DROP POLICY IF EXISTS view_only_upd ON tab_guide_media; CREATE POLICY view_only_upd ON tab_guide_media AS RESTRICTIVE FOR UPDATE USING (NOT is_view_only());
DROP POLICY IF EXISTS view_only_del ON tab_guide_media; CREATE POLICY view_only_del ON tab_guide_media AS RESTRICTIVE FOR DELETE USING (NOT is_view_only());
