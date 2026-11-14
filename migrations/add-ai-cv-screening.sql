-- AI CV screening (advice only) with a human decision, and an applicants sender mailbox.
alter table job_applications
  add column if not exists ai_score int,
  add column if not exists ai_verdict text,
  add column if not exists ai_reasons text,
  add column if not exists ai_concerns text,
  add column if not exists ai_reviewed_at timestamptz,
  add column if not exists decision text,
  add column if not exists decision_by text,
  add column if not exists decision_at timestamptz,
  add column if not exists decision_note text,
  add column if not exists ai_agreed boolean;
alter table mailboxes add column if not exists use_for_applicants boolean not null default false;
