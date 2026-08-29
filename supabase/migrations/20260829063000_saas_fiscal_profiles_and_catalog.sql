create table if not exists public.saas_company_fiscal_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  business_mode text not null default 'mixed' check (business_mode in ('goods','services','mixed','transport','communication','other')),
  tax_regime text,
  crt text,
  state_registration text,
  municipal_registration text,
  cnae_primary text,
  fiscal_environment text not null default 'homologation' check (fiscal_environment in ('homologation','production')),
  enabled_documents text[] not null default array[]::text[],
  default_cfop_in_state text,
  default_cfop_out_state text,
  default_nfse_service_code text,
  default_iss_rate numeric(8,4),
  certificate_storage_path text,
  certificate_expires_at timestamptz,
  certificate_subject text,
  nfce_csc_id text,
  nfce_csc_token_encrypted text,
  series_nfe integer,
  next_number_nfe bigint,
  series_nfce integer,
  next_number_nfce bigint,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, company_id)
);

create unique index if not exists saas_company_fiscal_profiles_org_company_singleton
  on public.saas_company_fiscal_profiles(organization_id, company_id) nulls not distinct;

create table if not exists public.saas_fiscal_catalog_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  item_type text not null check (item_type in ('product','service')),
  status text not null default 'active' check (status in ('active','inactive')),
  code text,
  name text not null,
  description text,
  unit text,
  sale_price numeric(18,6),
  cost_price numeric(18,6),
  gtin text,
  ncm text,
  cest text,
  product_origin text,
  cfop_in_state text,
  cfop_out_state text,
  icms_cst text,
  csosn text,
  icms_rate numeric(8,4),
  icms_reduction_rate numeric(8,4),
  ipi_cst text,
  ipi_rate numeric(8,4),
  pis_cst text,
  pis_rate numeric(8,4),
  cofins_cst text,
  cofins_rate numeric(8,4),
  service_code_national text,
  service_code_municipal text,
  cnae text,
  iss_rate numeric(8,4),
  iss_withheld boolean not null default false,
  inss_withheld boolean not null default false,
  ir_withheld boolean not null default false,
  csll_withheld boolean not null default false,
  pis_withheld boolean not null default false,
  cofins_withheld boolean not null default false,
  approximate_tax_rate numeric(8,4),
  stock_managed boolean not null default false,
  stock_quantity numeric(18,6),
  stock_minimum numeric(18,6),
  weight_net numeric(18,6),
  weight_gross numeric(18,6),
  fiscal_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saas_fiscal_catalog_org_company_idx on public.saas_fiscal_catalog_items(organization_id, company_id, item_type, status);
create index if not exists saas_fiscal_catalog_name_idx on public.saas_fiscal_catalog_items(organization_id, lower(name));

alter table public.saas_company_fiscal_profiles enable row level security;
alter table public.saas_fiscal_catalog_items enable row level security;

create policy "saas_fiscal_profiles_select_members" on public.saas_company_fiscal_profiles for select to authenticated
using (private.is_org_member(organization_id, auth.uid()) or private.is_any_admin(auth.uid()));
create policy "saas_fiscal_profiles_manage" on public.saas_company_fiscal_profiles for all to authenticated
using (private.can_manage_org(organization_id, auth.uid()) or private.is_any_admin(auth.uid()))
with check (private.can_manage_org(organization_id, auth.uid()) or private.is_any_admin(auth.uid()));
create policy "saas_fiscal_catalog_select_members" on public.saas_fiscal_catalog_items for select to authenticated
using (private.is_org_member(organization_id, auth.uid()) or private.is_any_admin(auth.uid()));
create policy "saas_fiscal_catalog_insert_members" on public.saas_fiscal_catalog_items for insert to authenticated
with check (private.is_org_member(organization_id, auth.uid()) or private.is_any_admin(auth.uid()));
create policy "saas_fiscal_catalog_update_members" on public.saas_fiscal_catalog_items for update to authenticated
using (private.is_org_member(organization_id, auth.uid()) or private.is_any_admin(auth.uid()))
with check (private.is_org_member(organization_id, auth.uid()) or private.is_any_admin(auth.uid()));
create policy "saas_fiscal_catalog_delete_managers" on public.saas_fiscal_catalog_items for delete to authenticated
using (private.can_manage_org(organization_id, auth.uid()) or private.is_any_admin(auth.uid()));

drop trigger if exists trg_audit_saas_company_fiscal_profiles on public.saas_company_fiscal_profiles;
create trigger trg_audit_saas_company_fiscal_profiles after insert or update or delete on public.saas_company_fiscal_profiles for each row execute function private.audit_saas_sensitive_change();
drop trigger if exists trg_audit_saas_fiscal_catalog_items on public.saas_fiscal_catalog_items;
create trigger trg_audit_saas_fiscal_catalog_items after insert or update or delete on public.saas_fiscal_catalog_items for each row execute function private.audit_saas_sensitive_change();

revoke truncate, trigger, references on public.saas_company_fiscal_profiles from anon, authenticated;
revoke truncate, trigger, references on public.saas_fiscal_catalog_items from anon, authenticated;
