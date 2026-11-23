-- Investment Packs: Staff Centre → Marketing → Pack Builder. One saved record per pack, with a stage and a private link.
create table if not exists invest_packs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  name text not null default 'Untitled pack',
  prepared_for text,
  stage text not null default 'draft',
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  active boolean not null default true,
  data jsonb not null default '{}'::jsonb,
  opens integer not null default 0,
  last_opened_at timestamptz,
  sent_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table invest_packs enable row level security;
create index if not exists invest_packs_biz on invest_packs(business_id, updated_at desc);

-- The two first packs, one for Jamaal and one for Trembs, for NOVOURQ's own company.
-- They start as Draft with the Voxy and Edmund Ridge figures; open Pack Builder, check them and press Create link.
insert into invest_packs (business_id, name, prepared_for, stage, data, created_by)
select 'bd780fdd-15e3-4306-8c87-788b23647ee5', 'Investment pack: Jamaal', 'Jamaal', 'draft', jsonb_build_object(
  'prepared_for', 'Jamaal', 'investors', 2, 'rate', 207,
  'car', jsonb_build_object('title', '2017 Toyota Voxy ZS', 'price_jmd', 2799000, 'deposit_pct', 20, 'weekly_jmd', 60000, 'note', 'Listed at J$2,799,000, or trade.', 'credit', 'Photos: Griffiths Motor Sales', 'photos', '[]'::jsonb),
  'home', jsonb_build_object('title', '74 Edmund Ridge, Montego Bay', 'details', 'Townhouse, St. James, Montego Bay. 2 bedrooms, 1 bathroom, 1,020 sq ft. We rent it on a master lease and sublet it furnished.', 'rent_gbp', 528, 'rent_months', 1, 'deposit_months', 2, 'sublet_gbp', jsonb_build_array(600, 700, 800), 'photos', '[]'::jsonb),
  'cover', jsonb_build_object('rent_jmd', 100000, 'finance_jmd', 50000, 'weekly_jmd', jsonb_build_array(20000, 30000, 40000, 50000, 60000)),
  'footer', 'Car earnings are a target, not guaranteed. Car finance is an estimate pending bank approval. Insurance, servicing and licensing are not included. Property figures are before utilities, furnishing and fees. Rates are indicative.'
), 'migration'
where not exists (select 1 from invest_packs where business_id = 'bd780fdd-15e3-4306-8c87-788b23647ee5' and name = 'Investment pack: Jamaal');

insert into invest_packs (business_id, name, prepared_for, stage, data, created_by)
select 'bd780fdd-15e3-4306-8c87-788b23647ee5', 'Investment pack: Trembs', 'Trembs', 'draft', jsonb_build_object(
  'prepared_for', 'Trembs', 'investors', 2, 'rate', 207,
  'car', jsonb_build_object('title', '2017 Toyota Voxy ZS', 'price_jmd', 2799000, 'deposit_pct', 20, 'weekly_jmd', 60000, 'note', 'Listed at J$2,799,000, or trade.', 'credit', 'Photos: Griffiths Motor Sales', 'photos', '[]'::jsonb),
  'home', jsonb_build_object('title', '74 Edmund Ridge, Montego Bay', 'details', 'Townhouse, St. James, Montego Bay. 2 bedrooms, 1 bathroom, 1,020 sq ft. We rent it on a master lease and sublet it furnished.', 'rent_gbp', 528, 'rent_months', 1, 'deposit_months', 2, 'sublet_gbp', jsonb_build_array(600, 700, 800), 'photos', '[]'::jsonb),
  'cover', jsonb_build_object('rent_jmd', 100000, 'finance_jmd', 50000, 'weekly_jmd', jsonb_build_array(20000, 30000, 40000, 50000, 60000)),
  'footer', 'Car earnings are a target, not guaranteed. Car finance is an estimate pending bank approval. Insurance, servicing and licensing are not included. Property figures are before utilities, furnishing and fees. Rates are indicative.'
), 'migration'
where not exists (select 1 from invest_packs where business_id = 'bd780fdd-15e3-4306-8c87-788b23647ee5' and name = 'Investment pack: Trembs');

notify pgrst, 'reload schema';
