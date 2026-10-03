-- Invoices in the Sangsters format (Finance → Invoices). invoice_settings holds the
-- fixed parts (logo, contact lines, bank details, signature, terms) that only
-- admins change; invoices holds each invoice. Numbers come from
-- next_invoice_number() so they never repeat (INV0011, INV0012, …).
-- Read/written through /api/invoices with the service role (RLS on, no policies).
create table if not exists public.invoice_settings (
  business_id uuid primary key,
  prefix text not null default 'INV',
  next_number int not null default 11,
  company_name text not null default 'Sangsters Group',
  logo_url text default '/sangsters-logo.jpg',
  logo_line1 text default 'Sangsters Group',
  logo_line2 text default 'Developments',
  contact_lines text default E'020 7164 0329\nfinance@sangstersgroup.com\nTallis House, 2 Tallis St, Blackfriars, London EC4Y 0AB\nwww.sangstersgroup.com',
  payment_instructions text default E'Metro Business Banking\nSANGSTERS GROUP\nDEVELOPMENTS LTD\nAccount Number: 56258066\nSort Code: 23-05-80',
  signature_name text default 'J Sangster',
  signature_url text,
  terms_note text default 'Please ensure that the invoice reference number is included in the payment reference. Our Terms and Conditions have been emailed to you for review. It is important that you carefully read and fully understand the sections regarding ''Admin Fees'' and ''Refunds''. NO REFUNDS',
  reply_to text default 'finance@sangstersgroup.com',
  updated_at timestamptz default now()
);
alter table public.invoice_settings enable row level security;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  number text,
  status text not null default 'draft',          -- draft | sent | paid | void
  bill_to_name text not null,
  bill_to_phone text,
  bill_to_email text,
  bill_to_address text,
  person_kind text,                               -- crm | pm_tenant | ea_tenant | owner | partner | guest | client
  person_id uuid,
  module text default 'company',
  issue_date date not null default current_date,
  due_date date,                                  -- null = on receipt
  currency text not null default 'GBP',
  items jsonb not null default '[]'::jsonb,       -- [{description, qty, amount}]
  total numeric not null default 0,
  note text,
  token text not null default encode(gen_random_bytes(18), 'hex'),
  sent_at timestamptz, sent_to text, viewed_at timestamptz, paid_at timestamptz, paid_by text
);
create unique index if not exists invoices_number_idx on public.invoices (business_id, number) where number is not null;
create unique index if not exists invoices_token_idx on public.invoices (token);
create index if not exists invoices_business_idx on public.invoices (business_id, created_at desc);
alter table public.invoices enable row level security;

create or replace function public.next_invoice_number(biz uuid) returns text language plpgsql security definer set search_path = public as $$
declare n int; p text;
begin
  insert into invoice_settings (business_id) values (biz) on conflict (business_id) do nothing;
  update invoice_settings set next_number = next_number + 1, updated_at = now() where business_id = biz returning next_number - 1, prefix into n, p;
  return p || lpad(n::text, 4, '0');
end $$;
revoke all on function public.next_invoice_number(uuid) from public, anon, authenticated;
