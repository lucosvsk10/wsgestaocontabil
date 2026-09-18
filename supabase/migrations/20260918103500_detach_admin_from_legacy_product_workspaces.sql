-- Move legacy/test product organizations away from the real WS admin login.
-- Nothing is deleted: test users, subscriptions, fiscal data and extractor data stay intact.
-- The admin login remains only on the clean internal organization created for the new Fiscal environment.

do $$
declare
  v_admin uuid;
  v_test uuid;
  v_internal_org uuid;
  v_org uuid;
begin
  select id into v_admin from auth.users where lower(email)='wsgestao@gmail.com' limit 1;
  select id into v_test from auth.users where lower(email)='wsteste@gmail.com' limit 1;
  select id into v_internal_org
  from public.organizations
  where slug='ws-gestao-operacao-interna'
  limit 1;

  if v_admin is null or v_test is null or v_internal_org is null then
    raise exception 'Não foi possível resolver os usuários/workspace necessários';
  end if;

  for v_org in
    select distinct om.organization_id
    from public.organization_members om
    where om.user_id=v_admin
      and om.organization_id<>v_internal_org
      and (
        exists (
          select 1
          from public.extractor_accounts ea
          where ea.organization_id=om.organization_id
        )
        or exists (
          select 1
          from public.saas_subscriptions ss
          where ss.organization_id=om.organization_id
            and ss.product_code in ('issuer','extractor')
        )
      )
  loop
    insert into public.organization_members (organization_id,user_id,role,status)
    values (v_org,v_test,'admin','active')
    on conflict (organization_id,user_id) do update
      set role='admin',status='active';

    update public.organizations
    set owner_user_id=v_test,
        updated_at=now()
    where id=v_org;

    update public.organization_members
    set role='owner',
        status='active'
    where organization_id=v_org
      and user_id=v_test;

    delete from public.organization_members
    where organization_id=v_org
      and user_id=v_admin;
  end loop;
end $$;
