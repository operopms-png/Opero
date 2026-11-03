-- New client accounts must never inherit Sangsters' own details. These column defaults used to be Sangsters' company name,
-- logo, phone, finance email, bank account and sort code, signature and terms. Existing rows are not changed.
ALTER TABLE public.invoice_settings ALTER COLUMN company_name SET DEFAULT '';
ALTER TABLE public.invoice_settings ALTER COLUMN logo_url SET DEFAULT NULL;
ALTER TABLE public.invoice_settings ALTER COLUMN logo_line1 SET DEFAULT NULL;
ALTER TABLE public.invoice_settings ALTER COLUMN logo_line2 SET DEFAULT NULL;
ALTER TABLE public.invoice_settings ALTER COLUMN contact_lines SET DEFAULT NULL;
ALTER TABLE public.invoice_settings ALTER COLUMN payment_instructions SET DEFAULT NULL;
ALTER TABLE public.invoice_settings ALTER COLUMN signature_name SET DEFAULT NULL;
ALTER TABLE public.invoice_settings ALTER COLUMN terms_note SET DEFAULT NULL;
ALTER TABLE public.invoice_settings ALTER COLUMN reply_to SET DEFAULT NULL;
ALTER TABLE public.email_format ALTER COLUMN company SET DEFAULT NULL;
ALTER TABLE public.email_format ALTER COLUMN contact_email SET DEFAULT NULL;
ALTER TABLE public.email_format ALTER COLUMN phone SET DEFAULT NULL;
ALTER TABLE public.email_format ALTER COLUMN website SET DEFAULT NULL;
ALTER TABLE public.email_format ALTER COLUMN address_uk SET DEFAULT NULL;
ALTER TABLE public.email_format ALTER COLUMN address_jm SET DEFAULT NULL;
ALTER TABLE public.ai_receptionist_settings ALTER COLUMN assistant_name SET DEFAULT 'Novourq Cloud AI';
ALTER TABLE public.ai_receptionist_settings ALTER COLUMN company_name SET DEFAULT NULL;
