-- Restore the single WS administrator panel.
-- Fiscal tools remain standalone SaaS products; the WS admin user receives direct membership
-- in the existing issuer/extractor organizations, without creating a separate "environment" layer.

do $$
declare
  v_admin uuid;
  v_test uuid;
  v_issuer_org uuid;
  v_extractor_org uuid;
  v_internal_org uuid;
begin
  select id into v_admin
  from auth.users
  where lower(email)='wsgestao@gmail.com'
  limit 1;

  select id into v_test
  from auth.users
  where lower(email)='wsteste@gmail.com'
  limit 1;

  if v_admin is null then
    raise exception 'Administrador WS não encontrado';
  end if;

  select ss.organization_id
    into v_issuer_org
  from public.saas_subscriptions ss
  join public.saas_plans sp on sp.id=ss.plan_id
  where sp.product_code='issuer'
    and ss.status in ('trialing','active','past_due')
  order by ss.created_at desc
  limit 1;

  select ea.organization_id
    into v_extractor_org
  from public.extractor_accounts ea
  where ea.status in ('trialing','active','past_due')
    and ea.plan_code <> 'internal_ws'
  order by ea.created_at
  limit 1;

  if v_issuer_org is null then
    raise exception 'Organização do Emissor não encontrada';
  end if;
  if v_extractor_org is null then
    raise exception 'Organização do Extrator não encontrada';
  end if;

  -- Keep the original SaaS owners/test histories intact.
  if v_test is not null then
    update public.organizations
       set owner_user_id=v_test,
           updated_at=now()
     where id in (v_issuer_org,v_extractor_org)
       and owner_user_id<>v_test;

    insert into public.organization_members (organization_id,user_id,role,status)
    values
      (v_issuer_org,v_test,'owner','active'),
      (v_extractor_org,v_test,'owner','active')
    on conflict (organization_id,user_id) do update
      set role='owner', status='active';
  end if;

  -- The main WS login can enter both complete SaaS products using its existing session.
  insert into public.organization_members (organization_id,user_id,role,status)
  values
    (v_issuer_org,v_admin,'admin','active'),
    (v_extractor_org,v_admin,'admin','active')
  on conflict (organization_id,user_id) do update
    set role='admin', status='active';

  select id into v_internal_org
  from public.organizations
  where slug='ws-gestao-operacao-interna'
  limit 1;

  -- This organization was created only by the discarded environment experiment.
  if v_internal_org is not null then
    if exists (
      select 1
      from public.saas_company_fiscal_profiles
      where organization_id=v_internal_org
    ) or exists (
      select 1
      from public.saas_fiscal_emissions
      where organization_id=v_internal_org
    ) or exists (
      select 1
      from public.extractor_companies ec
      join public.extractor_accounts ea on ea.id=ec.account_id
      where ea.organization_id=v_internal_org
        and ec.status<>'removed'
    ) then
      raise exception 'Workspace interno possui dados fiscais e não pode ser removido automaticamente';
    end if;

    delete from public.organizations where id=v_internal_org;
  end if;
end $$;

drop table if exists public.admin_product_workspaces;
