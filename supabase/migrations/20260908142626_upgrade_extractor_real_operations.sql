-- Functional extractor workspace: real aggregates and narrow, membership-checked actions.

create or replace function public.extractor_workspace_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_account public.extractor_accounts%rowtype;
  v_allowed_from date;
  v_companies jsonb := '[]'::jsonb;
  v_documents jsonb := '[]'::jsonb;
  v_totals jsonb := '{}'::jsonb;
  v_models jsonb := '{}'::jsonb;
  v_daily jsonb := '[]'::jsonb;
begin
  select ea.* into v_account
  from public.extractor_accounts ea
  where ea.status in ('trialing','active','past_due')
    and (
      private.is_extractor_member(ea.id, auth.uid())
      or private.is_any_admin(auth.uid())
    )
  order by ea.created_at
  limit 1;

  if v_account.id is null then
    return null;
  end if;

  v_allowed_from := greatest(
    coalesce(v_account.history_from, current_date - v_account.base_lookback_days),
    current_date - 366
  );

  select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.razao_social), '[]'::jsonb)
  into v_companies
  from (
    select
      fc.id,
      ec.id as extractor_company_id,
      fc.razao_social,
      fc.nome_fantasia,
      fc.cnpj,
      fc.uf,
      fc.last_sync_at,
      ec.automatic_sync,
      count(fd.id) filter (where fd.document_kind <> 'evento')::integer as documents,
      count(fd.id) filter (where fd.document_kind <> 'evento' and fd.direction in ('entrada','inbound'))::integer as entries,
      count(fd.id) filter (where fd.document_kind <> 'evento' and fd.direction in ('saida','outbound'))::integer as exits,
      count(fd.id) filter (where fd.document_kind <> 'evento' and fd.full_xml = true and fd.xml is not null)::integer as full_xml,
      count(fd.id) filter (where fd.document_kind <> 'evento' and not (fd.full_xml = true and fd.xml is not null))::integer as pending_xml,
      cert.valid_until as certificate_until,
      case when cert.valid_until is null then null else (cert.valid_until - current_date)::integer end as certificate_days,
      ps.status as purchase_status,
      ps.last_completed_at as purchase_last_completed_at,
      ps.last_error as purchase_last_error,
      ss.status as sales_status,
      ss.last_completed_at as sales_last_completed_at,
      ss.last_error as sales_last_error,
      coalesce(ss.xml_pending, 0)::integer as sales_xml_pending,
      coalesce(ss.xml_failed, 0)::integer as sales_xml_failed
    from public.extractor_companies ec
    join public.fiscal_companies fc on fc.id = ec.fiscal_company_id
    left join public.fiscal_dfe_documents fd
      on fd.company_id = fc.id
      and fd.issue_date >= v_allowed_from
    left join public.fiscal_purchase_sync_state ps on ps.company_id = fc.id
    left join public.fiscal_sales_sync_state ss on ss.company_id = fc.id
    left join lateral (
      select c.valid_until
      from public.fiscal_certificates c
      where c.company_id = fc.id and c.is_active = true
      order by c.valid_until desc
      limit 1
    ) cert on true
    where ec.account_id = v_account.id and ec.status = 'active'
    group by fc.id, ec.id, ec.automatic_sync, cert.valid_until,
      ps.status, ps.last_completed_at, ps.last_error,
      ss.status, ss.last_completed_at, ss.last_error, ss.xml_pending, ss.xml_failed
  ) row_data;

  select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.issue_date desc), '[]'::jsonb)
  into v_documents
  from (
    select
      fd.id,
      fc.id as company_id,
      fc.nome_fantasia as company_name,
      fc.razao_social as company_legal_name,
      fd.nsu,
      fd.schema_name,
      fd.document_kind,
      fd.full_xml,
      fd.direction,
      fd.access_key,
      fd.note_number,
      fd.series,
      fd.model,
      fd.issue_date,
      fd.value,
      fd.issuer_cnpj,
      fd.issuer_name,
      fd.recipient_cnpj,
      fd.status_code,
      fd.status_text,
      fd.parse_error,
      case
        when fd.direction in ('saida','outbound') then nullif(fd.recipient_cnpj, '')
        else nullif(fd.issuer_name, '')
      end as counterparty_name
    from public.extractor_companies ec
    join public.fiscal_companies fc on fc.id = ec.fiscal_company_id
    join public.fiscal_dfe_documents fd on fd.company_id = fc.id
    where ec.account_id = v_account.id
      and ec.status = 'active'
      and fd.document_kind <> 'evento'
      and fd.issue_date >= v_allowed_from
    order by fd.issue_date desc
    limit 200
  ) row_data;

  select jsonb_build_object(
    'documents', count(fd.id)::integer,
    'entries', count(fd.id) filter (where fd.direction in ('entrada','inbound'))::integer,
    'exits', count(fd.id) filter (where fd.direction in ('saida','outbound'))::integer,
    'value', coalesce(sum(fd.value), 0),
    'full_xml', count(fd.id) filter (where fd.full_xml = true and fd.xml is not null)::integer,
    'pending_xml', count(fd.id) filter (where not (fd.full_xml = true and fd.xml is not null))::integer
  ) into v_totals
  from public.extractor_companies ec
  join public.fiscal_dfe_documents fd on fd.company_id = ec.fiscal_company_id
  where ec.account_id = v_account.id
    and ec.status = 'active'
    and fd.document_kind <> 'evento'
    and fd.issue_date >= v_allowed_from;

  select jsonb_build_object(
    'nfe', count(fd.id) filter (where coalesce(fd.model,'') = '55')::integer,
    'nfce', count(fd.id) filter (where coalesce(fd.model,'') = '65')::integer,
    'nfse', count(fd.id) filter (where lower(coalesce(fd.document_kind,'')) = 'nfse' or lower(coalesce(fd.model,'')) in ('nfse','nfs-e'))::integer,
    'other', count(fd.id) filter (where coalesce(fd.model,'') not in ('55','65') and lower(coalesce(fd.document_kind,'')) <> 'nfse' and lower(coalesce(fd.model,'')) not in ('nfse','nfs-e'))::integer
  ) into v_models
  from public.extractor_companies ec
  join public.fiscal_dfe_documents fd on fd.company_id = ec.fiscal_company_id
  where ec.account_id = v_account.id
    and ec.status = 'active'
    and fd.document_kind <> 'evento'
    and fd.issue_date >= v_allowed_from;

  select coalesce(jsonb_agg(to_jsonb(d) order by d.day), '[]'::jsonb)
  into v_daily
  from (
    select gs::date as day, count(fd.id)::integer as documents
    from generate_series(current_date - 29, current_date, interval '1 day') gs
    left join public.extractor_companies ec
      on ec.account_id = v_account.id and ec.status = 'active'
    left join public.fiscal_dfe_documents fd
      on fd.company_id = ec.fiscal_company_id
      and fd.document_kind <> 'evento'
      and fd.issue_date >= gs
      and fd.issue_date < gs + interval '1 day'
    group by gs::date
  ) d;

  return jsonb_build_object(
    'account', jsonb_build_object(
      'id', v_account.id,
      'name', v_account.name,
      'plan_code', v_account.plan_code,
      'monthly_xml_limit', v_account.monthly_xml_limit,
      'base_lookback_days', v_account.base_lookback_days,
      'history_from', v_account.history_from,
      'allowed_from', v_allowed_from
    ),
    'companies', v_companies,
    'documents', v_documents,
    'totals', v_totals,
    'models', v_models,
    'daily', v_daily
  );
end;
$$;

create or replace function public.extractor_link_company_by_cnpj(_cnpj text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.extractor_accounts%rowtype;
  v_company public.fiscal_companies%rowtype;
  v_digits text := regexp_replace(coalesce(_cnpj,''), '\D', '', 'g');
begin
  if length(v_digits) <> 14 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_CNPJ', 'message', 'Informe um CNPJ válido.');
  end if;

  select ea.* into v_account
  from public.extractor_accounts ea
  where ea.status in ('trialing','active','past_due')
    and private.can_manage_extractor(ea.id, auth.uid())
  order by ea.created_at
  limit 1;

  if v_account.id is null then
    raise exception 'extractor_access_denied' using errcode = '42501';
  end if;

  select fc.* into v_company
  from public.fiscal_companies fc
  where regexp_replace(coalesce(fc.cnpj,''), '\D', '', 'g') = v_digits
    and fc.status <> 'inativa'
  order by fc.updated_at desc
  limit 1;

  if v_company.id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'FISCAL_COMPANY_NOT_CONFIGURED',
      'message', 'Este CNPJ ainda não possui configuração fiscal pronta para ser vinculada ao Extrato.'
    );
  end if;

  insert into public.extractor_companies(account_id, fiscal_company_id, status, automatic_sync)
  values (v_account.id, v_company.id, 'active', true)
  on conflict (account_id, fiscal_company_id) do update
    set status = 'active', updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'company_id', v_company.id,
    'name', coalesce(v_company.nome_fantasia, v_company.razao_social),
    'cnpj', v_company.cnpj
  );
end;
$$;

create or replace function public.extractor_queue_sync(_company_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.extractor_accounts%rowtype;
  v_company uuid;
  v_count integer := 0;
  v_month text := to_char(current_date - interval '30 days', 'YYMM');
begin
  select ea.* into v_account
  from public.extractor_accounts ea
  where ea.status in ('trialing','active','past_due')
    and private.can_manage_extractor(ea.id, auth.uid())
  order by ea.created_at
  limit 1;

  if v_account.id is null then
    raise exception 'extractor_access_denied' using errcode = '42501';
  end if;

  for v_company in
    select ec.fiscal_company_id
    from public.extractor_companies ec
    where ec.account_id = v_account.id
      and ec.status = 'active'
      and (_company_id is null or ec.fiscal_company_id = _company_id)
  loop
    insert into public.fiscal_purchase_sync_state(company_id, paused, status, consecutive_failures, last_error, next_scheduled_at, updated_at)
    values (v_company, false, 'queued', 0, null, now(), now())
    on conflict (company_id) do update set
      paused = false,
      status = case when public.fiscal_purchase_sync_state.status in ('running','queued') then public.fiscal_purchase_sync_state.status else 'queued' end,
      next_scheduled_at = now(),
      updated_at = now();

    insert into public.fiscal_sales_sync_state(
      company_id, paused, status, backfill_days, initial_backfill_done,
      reconciliation_complete, history_start_month, last_error, next_scheduled_at, updated_at
    ) values (
      v_company, false, 'queued', 30, false, false, v_month, null, now(), now()
    ) on conflict (company_id) do update set
      paused = false,
      status = case when public.fiscal_sales_sync_state.status in ('running','queued','reconciling','bootstrap_window') then public.fiscal_sales_sync_state.status else 'queued' end,
      next_scheduled_at = now(),
      updated_at = now();

    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    return jsonb_build_object('ok', false, 'code', 'NO_COMPANY', 'queued', 0);
  end if;

  perform public.trigger_fiscal_purchases_cron();
  perform public.trigger_fiscal_sales_cron();

  return jsonb_build_object('ok', true, 'queued', v_count, 'queued_at', now());
end;
$$;

revoke execute on function public.extractor_link_company_by_cnpj(text) from public, anon;
revoke execute on function public.extractor_queue_sync(uuid) from public, anon;
grant execute on function public.extractor_link_company_by_cnpj(text) to authenticated;
grant execute on function public.extractor_queue_sync(uuid) to authenticated;

comment on function public.extractor_link_company_by_cnpj(text) is 'Links only an already configured fiscal company to the authenticated extractor workspace.';
comment on function public.extractor_queue_sync(uuid) is 'Queues existing fiscal purchase/sales workers only for companies linked to the authenticated extractor workspace.';
