-- Messaging between PM staff and landlords, mirroring the existing
-- owner_messages feature used on the Vacation Rentals owner portal.
-- Uses pm_landlords.portal_user_id (already correctly linked to the
-- landlord's own auth user) so RLS can safely scope access per side —
-- unlike team_members, this table already has the right link.

create table if not exists pm_landlord_messages (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references pm_landlords(id) on delete cascade,
  sender text not null check (sender in ('staff','landlord')),
  message text not null default '',
  attachment_url text,
  created_at timestamptz not null default now()
);

alter table pm_landlord_messages enable row level security;

drop policy if exists "landlord or owning staff can read messages" on pm_landlord_messages;
create policy "landlord or owning staff can read messages"
on pm_landlord_messages
for select
using (
  landlord_id in (select id from pm_landlords where portal_user_id = auth.uid())
  or
  landlord_id in (select id from pm_landlords where user_id = auth.uid())
);

drop policy if exists "landlord can send own messages" on pm_landlord_messages;
create policy "landlord can send own messages"
on pm_landlord_messages
for insert
with check (
  sender = 'landlord'
  and landlord_id in (select id from pm_landlords where portal_user_id = auth.uid())
);

-- Staff sends go through the service-role API route (send-landlord-message),
-- which bypasses RLS by design — same pattern as owner_messages/send-message.
