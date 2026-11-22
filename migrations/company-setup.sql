-- Staff Centre → Company Setup: step-by-step plans (for example registering a US parent company) with documents stored on each step.
-- Server routes only (service role); admins by default, staff only when an admin ticks Company Setup for them.
create table if not exists company_plans (id uuid primary key default gen_random_uuid(), user_id uuid not null, title text not null, summary text, answers jsonb not null default '{}'::jsonb, created_by text, created_at timestamptz not null default now());
create table if not exists company_plan_steps (id uuid primary key default gen_random_uuid(), user_id uuid not null, plan_id uuid not null references company_plans(id) on delete cascade, position int not null default 0, title text not null, details text, status text not null default 'todo', owner text, due_date date, cost text, notes text, created_at timestamptz not null default now());
create table if not exists company_plan_files (id uuid primary key default gen_random_uuid(), user_id uuid not null, plan_id uuid not null references company_plans(id) on delete cascade, step_id uuid not null references company_plan_steps(id) on delete cascade, name text not null, path text not null, size bigint, content_type text, uploaded_by text, created_at timestamptz not null default now());
create index if not exists company_plan_steps_plan on company_plan_steps(plan_id, position);
create index if not exists company_plan_files_step on company_plan_files(step_id);
alter table company_plans enable row level security;
alter table company_plan_steps enable row level security;
alter table company_plan_files enable row level security;
