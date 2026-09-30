-- Marketing workspace (CRM-style boards): an Owner column on each board,
-- and let team members (not only the account owner) read email replies.
alter table marketing_campaigns add column if not exists owner text;
alter table marketing_emails add column if not exists owner text;
alter table marketing_socials add column if not exists owner text;
alter table marketing_ads add column if not exists owner text;

drop policy if exists "team reads marketing email replies" on marketing_email_replies;
create policy "team reads marketing email replies" on marketing_email_replies for select
  using (marketing_email_id in (
    select me.id from marketing_emails me
    where me.user_id = auth.uid()
       or me.user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))));

notify pgrst, 'reload schema';
