-- Estate Agency: viewing confirmation and feedback.
alter table estate_viewings add column if not exists confirmed_at timestamptz;
alter table estate_viewings add column if not exists feedback text;
alter table estate_viewings add column if not exists feedback_rating int check (feedback_rating between 1 and 5);
alter table estate_viewings add column if not exists interested text check (interested in ('Yes','Maybe','No'));
