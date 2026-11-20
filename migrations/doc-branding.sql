-- Per-company document branding: each paying client sets their own offer-letter email and contract page background
-- (Invoice settings → Documents). Run once in the Supabase SQL editor.
alter table invoice_settings add column if not exists offer_letter_email text;
alter table invoice_settings add column if not exists doc_background_url text;
