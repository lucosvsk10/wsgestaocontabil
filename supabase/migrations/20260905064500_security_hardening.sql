-- Security hardening: remove legacy certificate material and reduce the API surface.

-- Legacy A1 material was duplicated in the office-company table. The active
-- certificate already lives in fiscal_certificates encrypted at rest.
update public.companies
set certificate_data = null,
    certificate_password = null
where certificate_data is not null
   or certificate_password is not null;

alter table public.companies
  drop column if exists certificate_data,
  drop column if exists certificate_password;

-- These legacy columns are unused; encrypted material is kept in the dedicated
-- ciphertext/IV columns and is only available to service_role.
alter table public.fiscal_certificates
  drop column if exists certificate_data,
  drop column if exists password_hash;

create or replace function public.set_saas_certificate_bundle(
  _org_id uuid,
  _pfx_base64 text,
  _password text
) returns void
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  _pfx_id uuid;
  _password_id uuid;
  _pfx_name text := 'saas_a1_pfx_' || _org_id::text;
  _password_name text := 'saas_a1_password_' || _org_id::text;
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'service role only';
  end if;
  if _org_id is null or coalesce(_pfx_base64, '') = '' or coalesce(_password, '') = '' then
    raise exception 'invalid certificate bundle';
  end if;

  select certificate_pfx_secret_id, certificate_secret_id
    into _pfx_id, _password_id
  from public.saas_company_fiscal_profiles
  where organization_id = _org_id
  order by created_at
  limit 1;

  if _pfx_id is null then
    select id into _pfx_id from vault.secrets where name = _pfx_name limit 1;
  end if;
  if _password_id is null then
    select id into _password_id from vault.secrets where name = _password_name limit 1;
  end if;

  if _pfx_id is null then
    _pfx_id := vault.create_secret(_pfx_base64, _pfx_name, 'Certificado A1 SaaS');
  else
    perform vault.update_secret(_pfx_id, _pfx_base64, _pfx_name, 'Certificado A1 SaaS');
  end if;

  if _password_id is null then
    _password_id := vault.create_secret(_password, _password_name, 'Senha A1 SaaS');
  else
    perform vault.update_secret(_password_id, _password, _password_name, 'Senha A1 SaaS');
  end if;

  update public.saas_company_fiscal_profiles
  set certificate_pfx_secret_id = _pfx_id,
      certificate_secret_id = _password_id,
      certificate_storage_path = null,
      updated_at = now()
  where organization_id = _org_id;
end;
$$;

revoke all on function public.set_saas_certificate_bundle(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.set_saas_certificate_bundle(uuid, text, text)
  to service_role;

revoke all on table public.fiscal_certificates from anon, authenticated;
grant select (
  id, company_id, certificate_name, valid_from, valid_until, is_active,
  created_at, created_by, holder_cnpj, holder_name, serial_number,
  fingerprint, inspected_at, updated_at
) on table public.fiscal_certificates to authenticated;

revoke all on table public.fiscal_state_credentials from anon, authenticated;
revoke all on table public._fiscal_sales_debug_token from anon, authenticated;
revoke all on table public._temporary_sefaz_debug_token from anon, authenticated;

-- SaaS certificate/Vault identifiers and the encrypted CSC never need to reach
-- a browser. Keep normal profile editing working through column-level grants.
revoke all on table public.saas_company_fiscal_profiles from anon, authenticated;
grant select (
  id, organization_id, company_id, business_mode, tax_regime, crt,
  state_registration, municipal_registration, cnae_primary,
  fiscal_environment, enabled_documents, default_cfop_in_state,
  default_cfop_out_state, default_nfse_service_code, default_iss_rate,
  certificate_expires_at, certificate_subject, nfce_csc_id,
  series_nfe, next_number_nfe, series_nfce, next_number_nfce,
  series_nfse, next_number_nfse, series_cte, next_number_cte,
  series_mdfe, next_number_mdfe, notes, logo_path, legal_name,
  trade_name, tax_id, phone, email, postal_code, street, street_number,
  complement, district, city, state, city_ibge_code, created_at, updated_at,
  fiscal_environment_changed_at, fiscal_environment_changed_by
) on table public.saas_company_fiscal_profiles to authenticated;
grant insert (
  organization_id, company_id, business_mode, tax_regime, crt,
  state_registration, municipal_registration, cnae_primary,
  fiscal_environment, enabled_documents, default_cfop_in_state,
  default_cfop_out_state, default_nfse_service_code, default_iss_rate,
  certificate_expires_at, certificate_subject, nfce_csc_id,
  series_nfe, next_number_nfe, series_nfce, next_number_nfce,
  series_nfse, next_number_nfse, series_cte, next_number_cte,
  series_mdfe, next_number_mdfe, notes, logo_path, legal_name,
  trade_name, tax_id, phone, email, postal_code, street, street_number,
  complement, district, city, state, city_ibge_code
) on table public.saas_company_fiscal_profiles to authenticated;
grant update (
  company_id, business_mode, tax_regime, crt, state_registration,
  municipal_registration, cnae_primary, fiscal_environment,
  enabled_documents, default_cfop_in_state, default_cfop_out_state,
  default_nfse_service_code, default_iss_rate, certificate_expires_at,
  certificate_subject, nfce_csc_id, series_nfe, next_number_nfe,
  series_nfce, next_number_nfce, series_nfse, next_number_nfse,
  series_cte, next_number_cte, series_mdfe, next_number_mdfe, notes,
  logo_path, legal_name, trade_name, tax_id, phone, email, postal_code,
  street, street_number, complement, district, city, state,
  city_ibge_code, updated_at, fiscal_environment_changed_at,
  fiscal_environment_changed_by
) on table public.saas_company_fiscal_profiles to authenticated;

-- Certificates stored under the SaaS bucket are backend-only. Other private
-- organization assets remain available to members under the existing RLS.
drop policy if exists saas_storage_read_members on storage.objects;
create policy saas_storage_read_members on storage.objects for select to authenticated
using (
  bucket_id = 'saas-private'
  and split_part(name, '/', 2) <> 'certificates'
  and private.is_org_member(private.storage_org_id(name), auth.uid())
);

drop policy if exists saas_storage_insert_members on storage.objects;
create policy saas_storage_insert_members on storage.objects for insert to authenticated
with check (
  bucket_id = 'saas-private'
  and split_part(name, '/', 2) <> 'certificates'
  and private.is_org_member(private.storage_org_id(name), auth.uid())
);

drop policy if exists saas_storage_update_members on storage.objects;
create policy saas_storage_update_members on storage.objects for update to authenticated
using (
  bucket_id = 'saas-private'
  and split_part(name, '/', 2) <> 'certificates'
  and private.is_org_member(private.storage_org_id(name), auth.uid())
)
with check (
  bucket_id = 'saas-private'
  and split_part(name, '/', 2) <> 'certificates'
  and private.is_org_member(private.storage_org_id(name), auth.uid())
);

drop policy if exists saas_storage_delete_managers on storage.objects;
create policy saas_storage_delete_managers on storage.objects for delete to authenticated
using (
  bucket_id = 'saas-private'
  and split_part(name, '/', 2) <> 'certificates'
  and private.can_manage_org(private.storage_org_id(name), auth.uid())
);

-- Fiscal XML contains personal and tax data and must never be public.
update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['application/xml', 'text/xml', 'application/octet-stream']::text[]
where id = 'xml-nfe';

-- Trigger-only SECURITY DEFINER functions are never valid public RPC endpoints.
revoke all on function public.propagate_sales_document_to_dfe() from public, anon, authenticated;
grant execute on function public.propagate_sales_document_to_dfe() to service_role;
revoke all on function public.sync_sales_details_into_dfe(uuid) from public, anon, authenticated;
grant execute on function public.sync_sales_details_into_dfe(uuid) to service_role;

alter function public.is_valid_cnpj(text) set search_path = public, pg_temp;
alter function public.is_valid_cpf(text) set search_path = public, pg_temp;
alter function public.validate_saas_party_tax_id() set search_path = public, pg_temp;
alter function public.validate_saas_profile_tax_id() set search_path = public, pg_temp;

drop policy if exists fiscal_sync_health_admin_read on public.fiscal_sync_health;
create policy fiscal_sync_health_admin_read on public.fiscal_sync_health
for select to authenticated
using (private.is_any_admin((select auth.uid())));

-- Emission rows are immutable from browsers. Creation and state changes happen
-- through authenticated Edge Functions using service_role after authorization.
drop policy if exists saas_fiscal_emissions_manage_members on public.saas_fiscal_emissions;
revoke insert, update, delete, truncate, references, trigger
  on table public.saas_fiscal_emissions from anon, authenticated;
grant select on table public.saas_fiscal_emissions to authenticated;
