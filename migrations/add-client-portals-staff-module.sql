-- Allow a "Staff" module on Portal Access (Cleaners Portal and similar)
alter table client_portals drop constraint if exists client_portals_module_check;
alter table client_portals add constraint client_portals_module_check
  check (module = any (array['str','pm','ea','dev','staff','other']));

-- Team members with the Admin role can see their business's team list
-- (needed for the Cleaners Portal picker). Security definer avoids RLS recursion.
create or replace function public.my_admin_business_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select tm.user_id from team_members tm
  where tm.email = (auth.jwt() ->> 'email') and lower(tm.role) = 'admin'
$$;
drop policy if exists "business admins read team" on team_members;
create policy "business admins read team" on team_members for select
  using (user_id in (select public.my_admin_business_ids()));
