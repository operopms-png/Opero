-- Developments → Feasibility: saved sites (inputs, comps, facts, pads, ground settings in `data`). Same access rule as the other dev_ tables. Safe to run twice.
create table if not exists public.dev_feasibility (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid references public.dev_projects(id) on delete set null,
  name text not null default 'Untitled site',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dev_feasibility_user_idx on public.dev_feasibility(user_id);
alter table public.dev_feasibility enable row level security;
drop policy if exists dev_feasibility_owner_only on public.dev_feasibility;
create policy dev_feasibility_owner_only on public.dev_feasibility for all
  using ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))))
  with check ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))));
drop policy if exists view_only_ins on public.dev_feasibility;
drop policy if exists view_only_upd on public.dev_feasibility;
drop policy if exists view_only_del on public.dev_feasibility;
create policy view_only_ins on public.dev_feasibility for insert with check (not is_view_only());
create policy view_only_upd on public.dev_feasibility for update using (not is_view_only());
create policy view_only_del on public.dev_feasibility for delete using (not is_view_only());
