alter table public.saas_company_fiscal_profiles
  add column if not exists legal_name text,
  add column if not exists trade_name text,
  add column if not exists tax_id text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists postal_code text,
  add column if not exists street text,
  add column if not exists street_number text,
  add column if not exists complement text,
  add column if not exists district text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists city_ibge_code text,
  add column if not exists certificate_secret_id uuid,
  add column if not exists series_nfse text default '1',
  add column if not exists next_number_nfse bigint default 1,
  add column if not exists series_cte text default '1',
  add column if not exists next_number_cte bigint default 1,
  add column if not exists series_mdfe text default '1',
  add column if not exists next_number_mdfe bigint default 1;

create table if not exists public.saas_fiscal_emissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  document_type text not null check (document_type in ('nfe','nfce','nfse','cte','mdfe','dfe')),
  status text not null default 'draft' check (status in ('draft','validated','authorized','rejected','cancelled','error')),
  environment text not null default 'homologation' check (environment in ('homologation','production')),
  number text, series text, access_key text, protocol text,
  recipient_name text, recipient_tax_id text,
  total numeric(18,2) not null default 0,
  payload jsonb not null default '{}'::jsonb,
  response jsonb not null default '{}'::jsonb,
  xml text,
  authorized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists saas_fiscal_emissions_org_created_idx on public.saas_fiscal_emissions(organization_id, created_at desc);
create index if not exists saas_fiscal_emissions_org_type_idx on public.saas_fiscal_emissions(organization_id, document_type, status);
create unique index if not exists saas_fiscal_emissions_org_access_key_uidx on public.saas_fiscal_emissions(organization_id, access_key) where access_key is not null;
alter table public.saas_fiscal_emissions enable row level security;
drop policy if exists saas_fiscal_emissions_select_members on public.saas_fiscal_emissions;
create policy saas_fiscal_emissions_select_members on public.saas_fiscal_emissions for select to authenticated using (private.is_org_member(organization_id, auth.uid()) or private.is_any_admin(auth.uid()));
drop policy if exists saas_fiscal_emissions_manage_members on public.saas_fiscal_emissions;
create policy saas_fiscal_emissions_manage_members on public.saas_fiscal_emissions for all to authenticated using (private.has_org_role(organization_id,array['owner','admin','member']::text[],auth.uid()) or private.is_any_admin(auth.uid())) with check (private.has_org_role(organization_id,array['owner','admin','member']::text[],auth.uid()) or private.is_any_admin(auth.uid()));
grant select,insert,update,delete on public.saas_fiscal_emissions to authenticated;

create or replace function public.set_saas_certificate_password(_org_id uuid, _password text) returns uuid language plpgsql security definer set search_path='public','vault' as $$
declare _secret_id uuid; _name text;
begin
  if current_user not in ('service_role','postgres','supabase_admin') then raise exception 'service role only'; end if;
  if coalesce(_password,'')='' then raise exception 'empty certificate password'; end if;
  select certificate_secret_id into _secret_id from public.saas_company_fiscal_profiles where organization_id=_org_id order by created_at limit 1;
  _name := 'saas_a1_password_' || _org_id::text;
  if _secret_id is null then
    _secret_id := vault.create_secret(_password,_name,'Senha A1 SaaS '||_org_id::text);
    update public.saas_company_fiscal_profiles set certificate_secret_id=_secret_id,updated_at=now() where organization_id=_org_id;
  else
    perform vault.update_secret(_secret_id,_password,_name,'Senha A1 SaaS '||_org_id::text);
  end if;
  return _secret_id;
end; $$;
revoke all on function public.set_saas_certificate_password(uuid,text) from public, anon, authenticated;
grant execute on function public.set_saas_certificate_password(uuid,text) to service_role;

create or replace function public.get_saas_certificate_password(_org_id uuid) returns text language sql security definer set search_path='public','vault' as $$
  select ds.decrypted_secret from public.saas_company_fiscal_profiles p join vault.decrypted_secrets ds on ds.id=p.certificate_secret_id where p.organization_id=_org_id order by p.created_at limit 1
$$;
revoke all on function public.get_saas_certificate_password(uuid) from public, anon, authenticated;
grant execute on function public.get_saas_certificate_password(uuid) to service_role;
