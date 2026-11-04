-- Data Hub: tenants and landlords can ask for their data to be corrected or deleted.
-- 'subject' says whose data the request is about so a tenant request never blocks the account-deletion request.
alter table public.data_requests add column if not exists subject text not null default 'account';
alter table public.data_requests add column if not exists subject_email text;
alter table public.data_requests drop constraint if exists data_requests_kind_check;
alter table public.data_requests add constraint data_requests_kind_check check (kind in ('export','delete','correct'));
