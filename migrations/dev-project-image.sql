-- Development projects: one main image (render or photo), shown on the project card and on the Map.
alter table public.dev_projects add column if not exists image_url text;
