-- Add Xero OAuth2 columns to the integrations table
-- Run this in the Supabase SQL editor for the Opero project (mzjsxrlgnthelwwtfkke)

alter table integrations
  add column if not exists xero_access_token text,
  add column if not exists xero_refresh_token text,
  add column if not exists xero_tenant_id text,
  add column if not exists xero_tenant_name text,
  add column if not exists xero_token_expires_at timestamptz;
