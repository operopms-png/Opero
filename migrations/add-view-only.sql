-- View only: a team member (or partner with extra access) can open every tab they were given but cannot change records.
-- Messaging tables stay writable so they can still send messages and replies.
alter table team_members add column if not exists view_only boolean not null default false;
alter table owner_profiles add column if not exists view_only boolean not null default false;

create or replace function is_view_only() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from team_members tm where tm.email = (auth.jwt() ->> 'email') and tm.view_only)
$$;
grant execute on function is_view_only() to authenticated, anon;

do $$
declare t text;
  allow text[] := array['ai_chats','airbnb_threads','assistant_messages','estate_landlord_messages','estate_tenant_messages','guest_messages','mailbox_messages','notifications','owner_messages','partner_broadcasts','pm_landlord_messages','pm_tenant_messages','portal_feedback_messages','sms_messages','staff_conversation_members','staff_conversations','staff_messages','str_guest_messages','system_messages','website_chat_messages','website_chats','whatsapp_messages'];
begin
  for t in select tablename from pg_tables where schemaname='public' and rowsecurity and tablename <> all(allow) loop
    execute format('drop policy if exists view_only_ins on public.%I', t);
    execute format('drop policy if exists view_only_upd on public.%I', t);
    execute format('drop policy if exists view_only_del on public.%I', t);
    execute format('create policy view_only_ins on public.%I as restrictive for insert with check (not is_view_only())', t);
    execute format('create policy view_only_upd on public.%I as restrictive for update using (not is_view_only())', t);
    execute format('create policy view_only_del on public.%I as restrictive for delete using (not is_view_only())', t);
  end loop;
end $$;
