-- Each company's own email address for each kind of document (Invoice settings → Documents). Run once in the Supabase SQL editor.
alter table invoice_settings add column if not exists dept_emails text;
