alter table cleaning_tasks add column if not exists checklist jsonb, add column if not exists completed_at timestamptz, add column if not exists completed_by text;
alter table pm_cleaning_tasks add column if not exists checklist jsonb, add column if not exists before_media text, add column if not exists after_media text, add column if not exists completed_at timestamptz, add column if not exists completed_by text;
alter table estate_cleaning_tasks add column if not exists checklist jsonb, add column if not exists before_media text, add column if not exists after_media text, add column if not exists completed_at timestamptz, add column if not exists completed_by text;
alter table maintenance_tickets add column if not exists photos jsonb, add column if not exists source text, add column if not exists reported_by text, add column if not exists cleaning_task_id uuid;
alter table pm_maintenance add column if not exists source text, add column if not exists reported_by text;
alter table estate_maintenance add column if not exists source text, add column if not exists reported_by text;
create table if not exists cleaning_checklists (business_id uuid primary key, items jsonb not null default '[]', updated_at timestamptz default now());
alter table cleaning_checklists enable row level security;
notify pgrst, 'reload schema';
