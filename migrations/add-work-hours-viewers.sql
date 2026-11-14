create table if not exists work_hours_viewers (business_id uuid not null, email text not null, created_at timestamptz not null default now(), primary key (business_id, email));
alter table work_hours_viewers enable row level security;
