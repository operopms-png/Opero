-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- AI staff listed on Team Management, each with a job role, what they do,
-- when they must hand over to a person, and what they can access.
-- Owner-only rows, same pattern as team_members.

create table if not exists public.ai_staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  job_role text not null,
  responsibilities text,
  escalation text,
  access text,
  status text not null default 'active' check (status in ('active', 'not_set_up', 'paused')),
  created_at timestamptz not null default now()
);

alter table public.ai_staff enable row level security;

drop policy if exists "owner manages ai staff" on public.ai_staff;
create policy "owner manages ai staff" on public.ai_staff
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
