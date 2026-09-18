-- Give the WS administrator a clean Emissor Fiscal tenant without altering the
-- RAIZEMTEC/payment test workspace owned by the test user.
do $issuer$
declare
  v_admin uuid;
  v_org uuid;
  v_plan uuid;
  v_old_issuer_org uuid;
  v_profile uuid;
begin
  select id into v_admin
  from auth.users
  where lower(email)='wsgestao@gmail.com'
  limit 1;

  if v_admin is null then
    raise exception 'Administrador WS não encontrado';
  end if;

  select id into v_plan
  from public.saas_plans
  where product_code='issuer'
    and status='active'
  order by case when code='issuer_monthly' then 0 else 1 end, code
  limit 1;

  if v_plan is null then
    raise exception 'Plano ativo do Emissor não encontrado';
  end if;

  insert into public.organizations(name,slug,status,owner_user_id)
  values ('WS Gestão Contábil','ws-gestao-contabil-emissor','active',v_admin)
  on conflict (slug) do update
    set name=excluded.name,
        status='active',
        owner_user_id=v_admin,
        updated_at=now()
  returning id into v_org;

  insert into public.organization_members(organization_id,user_id,role,status)
  values(v_org,v_admin,'owner','active')
  on conflict (organization_id,user_id) do update
    set role='owner',
        status='active',
        updated_at=now();

  if not exists (
    select 1
    from public.saas_subscriptions
    where organization_id=v_org
      and product_code='issuer'
      and status in ('active','trialing','past_due')
  ) then
    insert into public.saas_subscriptions(
      organization_id,
      plan_id,
      status,
      provider,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      metadata,
      product_code,
      billing_mode,
      access_expires_at,
      provider_status
    )
    values(
      v_org,
      v_plan,
      'active',
      null,
      now(),
      null,
      false,
      jsonb_build_object(
        'access_source','ws_internal_admin',
        'billing_exempt',true,
        'created_for','wsgestao@gmail.com'
      ),
      'issuer',
      'one_time',
      null,
      'internal'
    );
  end if;

  select id into v_profile
  from public.saas_company_fiscal_profiles
  where organization_id=v_org
  order by created_at
  limit 1;

  if v_profile is null then
    insert into public.saas_company_fiscal_profiles(
      organization_id,
      business_mode,
      fiscal_environment,
      enabled_documents,
      legal_name,
      trade_name,
      tax_id,
      state_registration,
      municipal_registration,
      tax_regime,
      crt,
      cnae_primary,
      phone,
      email,
      postal_code,
      street,
      street_number,
      complement,
      district,
      city,
      state,
      city_ibge_code,
      notes,
      logo_path,
      certificate_storage_path,
      certificate_expires_at,
      certificate_subject,
      certificate_secret_id,
      certificate_pfx_secret_id
    )
    values(
      v_org,
      'mixed',
      'homologation',
      array[]::text[],
      'WS Gestão Contábil',
      'WS Gestão Contábil',
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      'Perfil interno limpo do administrador WS.',
      null,
      null,
      null,
      null,
      null,
      null
    );
  else
    update public.saas_company_fiscal_profiles
    set
      company_id=null,
      business_mode='mixed',
      tax_regime=null,
      crt=null,
      state_registration=null,
      municipal_registration=null,
      cnae_primary=null,
      fiscal_environment='homologation',
      enabled_documents=array[]::text[],
      default_cfop_in_state=null,
      default_cfop_out_state=null,
      default_nfse_service_code=null,
      default_iss_rate=null,
      certificate_storage_path=null,
      certificate_expires_at=null,
      certificate_subject=null,
      nfce_csc_id=null,
      nfce_csc_token_encrypted=null,
      series_nfe=null,
      next_number_nfe=null,
      series_nfce=null,
      next_number_nfce=null,
      notes='Perfil interno limpo do administrador WS.',
      logo_path=null,
      legal_name='WS Gestão Contábil',
      trade_name='WS Gestão Contábil',
      tax_id=null,
      phone=null,
      email=null,
      postal_code=null,
      street=null,
      street_number=null,
      complement=null,
      district=null,
      city=null,
      state=null,
      city_ibge_code=null,
      certificate_secret_id=null,
      certificate_pfx_secret_id=null,
      series_nfse='1',
      next_number_nfse=1,
      series_cte='1',
      next_number_cte=1,
      series_mdfe='1',
      next_number_mdfe=1,
      updated_at=now()
    where id=v_profile;
  end if;

  -- Remove the administrator only from the old issuer test organization.
  -- The organization, RAIZEMTEC profile, certificate, emissions and payment tests remain intact.
  for v_old_issuer_org in
    select distinct om.organization_id
    from public.organization_members om
    where om.user_id=v_admin
      and om.organization_id<>v_org
      and exists (
        select 1
        from public.saas_subscriptions ss
        where ss.organization_id=om.organization_id
          and ss.product_code='issuer'
      )
  loop
    delete from public.organization_members
    where organization_id=v_old_issuer_org
      and user_id=v_admin;
  end loop;
end
$issuer$;
