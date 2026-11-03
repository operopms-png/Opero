-- AI authority levels + audit trail: who authorised automation, why the AI acted, and per-business rules.
alter table ai_agents add column if not exists changed_by text;
alter table ai_agents add column if not exists changed_at timestamptz;
alter table ai_activity_log add column if not exists reason text;
alter table ai_activity_log add column if not exists authorised_by text;
alter table ai_pending_actions add column if not exists reason text;
alter table ai_pending_actions add column if not exists authority text;
alter table ai_pending_actions add column if not exists authorised_by text;

create table if not exists ai_action_rules (
  business_id uuid not null,
  rule_key text not null,
  mode text not null check (mode in ('auto','approval','never')),
  set_by text,
  set_at timestamptz not null default now(),
  primary key (business_id, rule_key)
);
alter table ai_action_rules enable row level security;
