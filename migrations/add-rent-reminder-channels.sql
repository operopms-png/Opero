-- Rent reminders go to the tenant's text, email and portal message
ALTER TABLE public.rent_reminders ADD COLUMN IF NOT EXISTS tenant_id text, ADD COLUMN IF NOT EXISTS email text, ADD COLUMN IF NOT EXISTS channels text;
NOTIFY pgrst, 'reload schema';
