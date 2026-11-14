-- New team members are added to the "All staff" chat automatically (external partners are left out).
create or replace function public.add_to_all_staff_chat() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email is null or new.email = '' or coalesce(new.role,'') ilike '%partner%' then return new; end if;
  insert into staff_conversation_members (conversation_id, member_email, member_name)
  select c.id, new.email, trim(coalesce(new.name, new.email))
  from staff_conversations c
  where c.user_id = new.user_id and c.name = 'All staff'
    and not exists (select 1 from staff_conversation_members m where m.conversation_id = c.id and lower(m.member_email) = lower(new.email));
  return new;
end $$;

drop trigger if exists trg_add_to_all_staff_chat on public.team_members;
create trigger trg_add_to_all_staff_chat after insert or update of email on public.team_members
for each row execute function public.add_to_all_staff_chat();
