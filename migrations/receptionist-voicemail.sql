-- AI Receptionist, phone: a voicemail message and a "ring my phone first" switch. Safe to run twice.
alter table public.ai_receptionist_settings add column if not exists phone_voicemail_message text;
alter table public.ai_receptionist_settings add column if not exists phone_ring_first boolean not null default false;
