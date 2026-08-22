-- Shared table for org-wide staff resources that aren't tied to a single
-- property: staff training SOPs and reusable landlord/tenant contract
-- templates. Surfaced as two new tabs ("Company SOPs" and "Contract
-- Templates") inside Property Management, Developments, Vacation Rentals
-- and Estate Agency, all reading/writing this one table so everything
-- lives in a single place regardless of which module you're in.

create table if not exists company_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('sop', 'contract_template')),
  name text not null,
  url text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists company_documents_user_category_idx
  on company_documents (user_id, category, created_at desc);

alter table company_documents enable row level security;

drop policy if exists "owner manages own company documents" on company_documents;
create policy "owner manages own company documents"
  on company_documents
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
