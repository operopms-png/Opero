-- Applications board (CRM style): who is handling the candidate, and the interview date/time.
alter table job_applications add column if not exists owner text;
alter table job_applications add column if not exists interview_at timestamptz;
notify pgrst, 'reload schema';
