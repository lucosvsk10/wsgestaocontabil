alter table public.saas_company_fiscal_profiles
  add column if not exists certificate_pfx_secret_id uuid;

create or replace function public.get_saas_certificate_bundle(_org_id uuid)
returns jsonb
language sql
security definer
set search_path='public','vault'
as $$
  select jsonb_build_object(
    'pfx_base64', pfx.decrypted_secret,
    'password', pwd.decrypted_secret
  )
  from public.saas_company_fiscal_profiles p
  join vault.decrypted_secrets pfx on pfx.id = p.certificate_pfx_secret_id
  join vault.decrypted_secrets pwd on pwd.id = p.certificate_secret_id
  where p.organization_id = _org_id
  order by p.created_at
  limit 1
$$;

revoke all on function public.get_saas_certificate_bundle(uuid) from public, anon, authenticated;
grant execute on function public.get_saas_certificate_bundle(uuid) to service_role;
