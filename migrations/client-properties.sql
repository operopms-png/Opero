-- Staff Centre → Client Properties: every property a client (owner) brings to
-- us, before it is signed — details, photos, owner, what they want, our
-- numbers, activity, documents and stage. Read/written only through
-- /api/client-properties with the service role (RLS on, no policies).
create table if not exists public.client_properties (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,

  -- property
  address text not null,
  area text,                 -- parish / region
  subarea text,              -- town
  country text default 'Jamaica',
  price numeric,
  price_text text,
  currency text default 'JMD',
  price_is_rent boolean default false,
  bedrooms numeric,
  bathrooms numeric,
  style text,
  sqft numeric,
  lot_sqft numeric,
  lot_acres numeric,
  amenities text,
  description text,
  mls text,
  source_url text,
  listing jsonb,             -- full imported listing (status, agent fields, lat/lng…)
  photos jsonb not null default '[]'::jsonb,     -- [url]
  documents jsonb not null default '[]'::jsonb,  -- [{name,url,path,size,at}]

  -- owner
  owner_name text not null,
  owner_phone text,
  owner_email text,
  referred_by text,
  agent text,                -- listing agent, free text

  -- pipeline
  service text,              -- sell | guaranteed_rent | partnership | airbnb | long_let | unsure
  stage text not null default 'new',  -- new | viewing | numbers | offer | signed | passed
  activity jsonb not null default '[]'::jsonb,   -- [{at,by,kind,text}] newest first
  numbers jsonb,             -- latest Deal Analyser summary
  crm_contact_id uuid,
  crm_deal_id uuid,
  converted_to text,         -- pm | vr
  converted_id uuid,
  signed_at timestamptz
);

create index if not exists client_properties_business_idx on public.client_properties (business_id, created_at desc);
alter table public.client_properties enable row level security;
