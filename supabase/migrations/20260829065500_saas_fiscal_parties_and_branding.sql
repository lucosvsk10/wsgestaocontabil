alter table public.saas_company_fiscal_profiles
  add column if not exists logo_path text;

create table if not exists public.saas_fiscal_parties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  party_type text not null check (party_type in ('customer','supplier','carrier')),
  status text not null default 'active' check (status in ('active','inactive')),
  person_type text not null default 'legal' check (person_type in ('legal','individual','foreign')),
  legal_name text not null,
  trade_name text,
  tax_id text,
  state_registration text,
  municipal_registration text,
  ie_indicator text,
  suframa text,
  tax_regime text,
  email text,
  phone text,
  mobile text,
  contact_name text,
  website text,
  postal_code text,
  street text,
  street_number text,
  complement text,
  district text,
  city text,
  state text,
  country text not null default 'Brasil',
  city_ibge_code text,
  country_code text default '1058',
  final_consumer boolean not null default false,
  icms_taxpayer boolean not null default false,
  billing_email text,
  payment_terms text,
  credit_limit numeric(15,2),
  bank_name text,
  bank_branch text,
  bank_account text,
  pix_key text,
  rntrc text,
  antt_category text,
  vehicle_plate text,
  vehicle_state text,
  vehicle_rntc text,
  freight_default_mode text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saas_fiscal_parties_org_type_name_idx
  on public.saas_fiscal_parties(organization_id, party_type, legal_name);
create index if not exists saas_fiscal_parties_tax_id_idx
  on public.saas_fiscal_parties(organization_id, tax_id);

alter table public.saas_fiscal_parties enable row level security;

drop policy if exists saas_fiscal_parties_select_members on public.saas_fiscal_parties;
create policy saas_fiscal_parties_select_members
  on public.saas_fiscal_parties for select to authenticated
  using (private.is_org_member(organization_id, auth.uid()) or private.is_any_admin(auth.uid()));

drop policy if exists saas_fiscal_parties_manage_members on public.saas_fiscal_parties;
create policy saas_fiscal_parties_manage_members
  on public.saas_fiscal_parties for all to authenticated
  using (private.has_org_role(organization_id, array['owner','admin','member']::text[], auth.uid()) or private.is_any_admin(auth.uid()))
  with check (private.has_org_role(organization_id, array['owner','admin','member']::text[], auth.uid()) or private.is_any_admin(auth.uid()));

grant select, insert, update, delete on public.saas_fiscal_parties to authenticated;
grant select, update on public.saas_company_fiscal_profiles to authenticated;
