-- Phone notifications: a text-message number on escalation rules, and saved browser/phone
-- push subscriptions. Both are read and written only through the API routes (service role).
alter table ai_escalation_rules add column if not exists notify_phone text;

create table if not exists ai_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,      -- the business
  member_id uuid,             -- the signed-in person who turned notifications on
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_push_subscriptions_biz on ai_push_subscriptions (user_id);
alter table ai_push_subscriptions enable row level security;

notify pgrst, 'reload schema';
