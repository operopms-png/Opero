-- Staff Centre → Documents
-- Templates staff fill in and send (with wording-change approval), sent documents
-- with online signing, a file library, and automatic sending rules.
-- All tables are server-only (RLS on, no policies) — the API uses the service role.

create table if not exists public.doc_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  name text not null,
  category text not null default 'Other',
  audience text not null default 'any',          -- tenant | owner | guest | partner | client | any
  body text not null default '',                  -- HTML with {blank} placeholders
  defaults jsonb not null default '{}'::jsonb,    -- default values for blanks, e.g. {"emergency_number": "..."}
  lock_mode text not null default 'approval' check (lock_mode in ('locked', 'approval', 'editable')),
  needs_signature boolean not null default true,
  remind_days int not null default 3,
  email_subject text,
  email_message text,
  active boolean not null default true,
  source_url text,                                -- the original file it was made from
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists doc_templates_biz_idx on public.doc_templates (business_id);
alter table public.doc_templates enable row level security;

create table if not exists public.doc_sends (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  template_id uuid references public.doc_templates(id) on delete set null,
  title text not null,
  body text not null,                             -- what the client sees (filled + edited)
  base_body text,                                 -- the template as filled in, before any wording edits
  changed boolean not null default false,         -- wording differs from the template
  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'rejected', 'sent', 'opened', 'signed', 'void')),
  person_kind text, person_id uuid,
  recipient_name text not null,
  recipient_email text,
  property_label text,
  email_subject text,
  email_message text,
  needs_signature boolean not null default true,
  remind_days int not null default 3,
  token text not null default encode(gen_random_bytes(18), 'hex'),
  approval_id uuid,
  rule_id uuid,
  client_fields jsonb not null default '{}'::jsonb, -- blanks the client filled in when signing
  created_by text,
  created_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz, opened_at timestamptz,
  signed_at timestamptz, signed_name text, signed_ip text, signed_ua text,
  last_reminder_at timestamptz, reminders int not null default 0
);
create unique index if not exists doc_sends_token_idx on public.doc_sends (token);
create index if not exists doc_sends_biz_idx on public.doc_sends (business_id, created_at desc);
alter table public.doc_sends enable row level security;

create table if not exists public.doc_files (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  name text not null,
  folder text not null default 'General',
  url text not null,
  size bigint, mime text,
  property_label text,
  uploaded_by text,
  created_at timestamptz not null default now()
);
create index if not exists doc_files_biz_idx on public.doc_files (business_id);
alter table public.doc_files enable row level security;

create table if not exists public.doc_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  trigger text not null,                          -- booking_confirmed | pm_tenant_added | ea_tenancy_created | client_signed | partner_paid | rent_late_7 | lease_ending_60
  template_id uuid not null references public.doc_templates(id) on delete cascade,
  enabled boolean not null default false,
  enabled_at timestamptz,                         -- only events after this are sent
  sent_count int not null default 0,
  last_run_at timestamptz,
  created_by text,
  created_at timestamptz not null default now()
);
alter table public.doc_rules enable row level security;

-- one send per rule per event (booking id, tenant id, payment id…)
create table if not exists public.doc_rule_log (
  rule_id uuid not null references public.doc_rules(id) on delete cascade,
  source_id text not null,
  send_id uuid,
  note text,
  created_at timestamptz not null default now(),
  primary key (rule_id, source_id)
);
alter table public.doc_rule_log enable row level security;

-- approvals can point at the thing they approve (a document with changed wording)
alter table public.approvals add column if not exists ref_id uuid;
alter table public.approvals add column if not exists link text;
