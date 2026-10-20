-- Property Management: vacancies, viewings and loans & mortgages (mirrors the Estate Agency versions).
create table if not exists pm_vacancies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  property_id uuid references pm_properties(id) on delete cascade,
  type text,
  room_type text,
  rent numeric,
  available_date date,
  bedrooms text,
  description text,
  created_at timestamptz not null default now()
);
create table if not exists pm_viewings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  property_id uuid references pm_properties(id) on delete cascade,
  prospect_name text,
  prospect_email text,
  prospect_phone text,
  scheduled_at timestamptz,
  status text,
  notes text,
  source text,
  created_at timestamptz not null default now()
);
create table if not exists pm_mortgages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  property_id uuid references pm_properties(id) on delete cascade,
  bank text,
  amount numeric,
  rate numeric,
  start_date date,
  end_date date,
  duration text,
  monthly_payment numeric,
  insurance numeric,
  type text,
  created_at timestamptz not null default now()
);
alter table pm_vacancies enable row level security;
alter table pm_viewings enable row level security;
alter table pm_mortgages enable row level security;
drop policy if exists pm_vacancies_owner_only on pm_vacancies;
create policy pm_vacancies_owner_only on pm_vacancies for all
  using ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))))
  with check ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))));
drop policy if exists pm_viewings_owner_only on pm_viewings;
create policy pm_viewings_owner_only on pm_viewings for all
  using ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))))
  with check ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))));
drop policy if exists pm_mortgages_owner_only on pm_mortgages;
create policy pm_mortgages_owner_only on pm_mortgages for all
  using ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))))
  with check ((auth.uid() = user_id) or (user_id in (select tm.user_id from team_members tm where tm.email = (auth.jwt() ->> 'email'))));
