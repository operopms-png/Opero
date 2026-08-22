-- Same in-house e-signature pattern as migrations/add-lease-esignature.sql,
-- applied to Estate Agency's estate_tenancies instead of PM's pm_leases.
-- Kept as a separate table/columns (not shared with pm_leases) because EA
-- and PM are intentionally separate data models -- see AGENTS notes in
-- app/pm and app/estate. The signing page/API is shared (it looks up
-- whichever table the token matches), but the records themselves aren't.

alter table estate_tenancies
  add column if not exists sign_token uuid not null default gen_random_uuid(),
  add column if not exists tenant_signed_at timestamptz,
  add column if not exists landlord_signed_at timestamptz,
  add column if not exists document_url text;

create unique index if not exists estate_tenancies_sign_token_idx on estate_tenancies(sign_token);

create table if not exists estate_tenancy_signatures (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references estate_tenancies(id) on delete cascade,
  signer_role text not null check (signer_role in ('tenant','landlord')),
  signer_name text not null,
  method text not null check (method in ('typed','drawn')),
  signature_data text not null,
  ip_address text,
  user_agent text,
  document_hash text not null,
  opened_at timestamptz,
  signed_at timestamptz not null default now()
);

create index if not exists estate_tenancy_signatures_tenancy_id_idx on estate_tenancy_signatures(tenancy_id);

alter table estate_tenancy_signatures enable row level security;

drop policy if exists "owner reads own tenancy signatures" on estate_tenancy_signatures;
create policy "owner reads own tenancy signatures"
  on estate_tenancy_signatures
  for select
  using (tenancy_id in (select id from estate_tenancies where user_id = auth.uid()));

notify pgrst, 'reload schema';
