-- Staff logins (Cleaner/Maintenance/etc) have their own Supabase Auth
-- user, but their team_members row is owned by user_id = the account
-- owner who created them, not by the staff member's own auth id.
-- Any RLS policy of the form "user_id = auth.uid()" therefore silently
-- blocks staff from ever reading their own role, which is why the
-- Cleaner/Maintenance redirect (layout.tsx, login/page.tsx) never
-- fires in production: the select just comes back empty.
--
-- This adds a policy letting a logged-in user read team_members rows
-- that match their own email, regardless of who owns the row.
drop policy if exists "self can read own team_members row" on team_members;

create policy "self can read own team_members row"
on team_members
for select
using (email = (auth.jwt() ->> 'email'));
