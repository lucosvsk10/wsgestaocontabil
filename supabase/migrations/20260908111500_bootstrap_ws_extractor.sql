create index if not exists extractor_companies_fiscal_company_idx
  on public.extractor_companies(fiscal_company_id);
create index if not exists extractor_history_requests_requested_by_idx
  on public.extractor_history_requests(requested_by, created_at desc);

do $$
declare
  v_owner uuid;
  v_organization uuid;
  v_account uuid;
begin
  select u.id into v_owner
  from public.users u
  where u.email = 'wsgestao@gmail.com' and u.role = 'admin'
  limit 1;

  if v_owner is null then
    raise notice 'WS admin not found; extractor workspace bootstrap skipped';
    return;
  end if;

  insert into public.organizations(name, slug, status, owner_user_id)
  values ('WS Gestão Contábil — Extrator', 'ws-gestao-extrator', 'active', v_owner)
  on conflict (slug) do update
    set name = excluded.name, status = 'active', updated_at = now()
  returning id into v_organization;

  insert into public.extractor_accounts(
    organization_id, name, status, plan_code, monthly_xml_limit, base_lookback_days
  ) values (
    v_organization, 'WS Gestão Contábil', 'active', 'office_20000', 20000, 30
  )
  on conflict (organization_id) do update
    set status = 'active', updated_at = now()
  returning id into v_account;

  insert into public.extractor_companies(account_id, fiscal_company_id, status, automatic_sync)
  select v_account, fc.id, 'active', true
  from public.fiscal_companies fc
  on conflict (account_id, fiscal_company_id) do update
    set status = 'active', updated_at = now();
end;
$$;
