-- Each company connects its own Twilio number for Texts. The auth token is stored encrypted and
-- never sent to the browser. Rows without these columns use the platform number from Netlify.
alter table public.sms_connections add column if not exists twilio_account_sid text;
alter table public.sms_connections add column if not exists twilio_auth_token_enc text;
alter table public.sms_connections add column if not exists connected_by_name text;
