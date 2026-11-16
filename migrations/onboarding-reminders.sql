-- Onboarding links: remember how many automatic reminders have gone out and when the last one was sent.
-- Safe to run twice.
alter table public.onboarding_links add column if not exists reminders integer not null default 0;
alter table public.onboarding_links add column if not exists last_reminded_at timestamptz;
