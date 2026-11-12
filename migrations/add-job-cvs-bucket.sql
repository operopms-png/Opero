-- Private bucket for CVs uploaded on the careers page. Opened only through signed links (app/api/cv).
INSERT INTO storage.buckets (id, name, public) VALUES ('job-cvs', 'job-cvs', false) ON CONFLICT (id) DO NOTHING;
