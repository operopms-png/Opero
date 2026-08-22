-- In-house e-signature for pm_leases. A lease gets a stable, unguessable
-- sign_token generated on creation; that token is what the public signing
-- page (/sign/[token]) uses to look up and sign the lease WITHOUT the
-- signer needing an Opero login. Actual reads/writes for that public page
-- always go through app/api/lease-sign (service role), never direct
-- client queries, so no public RLS policy is needed on these tables.

alter table pm_leases
  add column if not exists sign_token uuid not null default gen_random_uuid(),
  add column if not exists tenant_signed_at timestamptz,
  add column if not exists landlord_signed_at timestamptz,
  add column if not exists signed_document_url text;

create unique index if not exists pm_leases_sign_token_idx on pm_leases(sign_token);

-- One row per signer per lease. Kept separate from pm_leases so a lease
-- can be signed by both tenant and landlord without overloading a single
-- row, and so the audit fields (ip, device, hash) have a clear home.
create table if not exists lease_signatures (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references pm_leases(id) on delete cascade,
  signer_role text not null check (signer_role in ('tenant','landlord')),
  signer_name text not null,
  method text not null check (method in ('typed','drawn')),
  signature_data text not null,       -- typed name, or base64 PNG for drawn signatures
  ip_address text,
  user_agent text,
  document_hash text not null,        -- sha256 of lease terms at moment of signing, locks that version
  opened_at timestamptz,
  signed_at timestamptz not null default now()
);

create index if not exists lease_signatures_lease_id_idx on lease_signatures(lease_id);

alter table lease_signatures enable row level security;

-- Only the property manager who owns the lease can read signature
-- records. All writes happen server-side via the service role in
-- app/api/lease-sign, so there is no public insert policy here.
drop policy if exists "owner reads own lease signatures" on lease_signatures;
create policy "owner reads own lease signatures"
  on lease_signatures
  for select
  using (lease_id in (select id from pm_leases where user_id = auth.uid()));

notify pgrst, 'reload schema';
