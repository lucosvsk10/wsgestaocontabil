-- Keep every Extrator surface on the same canonical document identity.
-- Raw DF-e rows are preserved for audit/NSU history, but one fiscal document is
-- counted once per company/access key. Sales rows may enrich the same identity.

create or replace function public.extractor_workspace_snapshot()
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  v_account public.extractor_accounts%rowtype;
  v_allowed_from date;
  v_from_ts timestamptz;
  v_to_ts timestamptz;
  v_companies jsonb := '[]'::jsonb;
  v_documents jsonb := '[]'::jsonb;
  v_totals jsonb := '{}'::jsonb;
  v_models jsonb := '{}'::jsonb;
  v_daily jsonb := '[]'::jsonb;
begin
  select ea.* into v_account
  from public.extractor_accounts ea
  where ea.status in ('trialing','active','past_due')
    and private.is_extractor_member(ea.id, auth.uid())
  order by ea.created_at
  limit 1;

  if v_account.id is null then
    return null;
  end if;

  v_allowed_from := public.extractor_effective_history_start(
    v_account.history_from,
    v_account.base_lookback_days
  );
  v_from_ts := (v_allowed_from::timestamp at time zone 'America/Sao_Paulo');
  v_to_ts := ((public.extractor_local_date() + 1)::timestamp at time zone 'America/Sao_Paulo');

  with active_companies as (
    select
      ec.id extractor_company_id,
      ec.fiscal_company_id company_id,
      ec.automatic_sync,
      ec.profile_overrides,
      fc.razao_social,
      coalesce(nullif(ec.profile_overrides->>'trade_name',''), fc.nome_fantasia) nome_fantasia,
      fc.cnpj,
      fc.uf,
      fc.last_sync_at,
      fc.fiscal_settings,
      ps.status purchase_status,
      ps.last_started_at purchase_last_started_at,
      ps.last_completed_at purchase_last_completed_at,
      ps.last_error purchase_last_error,
      ss.status sales_status,
      ss.last_started_at sales_last_started_at,
      ss.last_completed_at sales_last_completed_at,
      ss.last_error sales_last_error,
      coalesce(ss.xml_pending,0)::integer sales_xml_pending,
      coalesce(ss.xml_failed,0)::integer sales_xml_failed,
      cert.valid_until certificate_until
    from public.extractor_companies ec
    join public.fiscal_companies fc on fc.id=ec.fiscal_company_id
    left join public.fiscal_purchase_sync_state ps on ps.company_id=fc.id
    left join public.fiscal_sales_sync_state ss on ss.company_id=fc.id
    left join lateral (
      select c.valid_until
      from public.fiscal_certificates c
      where c.company_id=fc.id and c.is_active=true
      order by c.valid_until desc
      limit 1
    ) cert on true
    where ec.account_id=v_account.id
      and ec.status='active'
  ),
  raw as (
    select
      ac.company_id,
      coalesce(nullif(fd.access_key,''),'dfe:'||fd.id::text) identity_key,
      fd.direction,
      coalesce(
        nullif(fd.model,''),
        case when length(coalesce(fd.access_key,''))=44 then substr(fd.access_key,21,2) else '' end
      ) model,
      fd.document_kind,
      fd.issue_date,
      coalesce(fd.value,0)::numeric value,
      (fd.full_xml=true and fd.xml is not null) full_xml,
      1 source_rank
    from active_companies ac
    join public.fiscal_dfe_documents fd on fd.company_id=ac.company_id
    where fd.document_kind<>'evento'
      and fd.issue_date>=v_from_ts
      and fd.issue_date<v_to_ts

    union all

    select
      ac.company_id,
      coalesce(nullif(sd.access_key,''),'sale:'||sd.id::text) identity_key,
      'saida'::text direction,
      coalesce(
        nullif(sd.model,''),
        case when length(coalesce(sd.access_key,''))=44 then substr(sd.access_key,21,2) else '' end
      ) model,
      'nfe'::text document_kind,
      sd.issue_date,
      coalesce(sd.total_value,0)::numeric value,
      (sd.xml is not null) full_xml,
      0 source_rank
    from active_companies ac
    join public.fiscal_sales_documents sd on sd.company_id=ac.company_id
    where sd.issue_date>=v_from_ts
      and sd.issue_date<v_to_ts
  ),
  docs as (
    select distinct on(company_id, identity_key)
      company_id,identity_key,direction,model,document_kind,issue_date,value,full_xml
    from raw
    order by company_id,identity_key,full_xml desc,source_rank asc,issue_date desc
  ),
  doc_stats as (
    select
      company_id,
      count(*)::integer documents,
      count(*) filter (where direction in ('entrada','inbound'))::integer entries,
      count(*) filter (where direction in ('saida','outbound'))::integer exits,
      count(*) filter (where full_xml)::integer full_xml,
      count(*) filter (where not full_xml)::integer pending_xml
    from docs
    group by company_id
  ),
  company_rows as (
    select
      ac.company_id id,
      ac.extractor_company_id,
      ac.razao_social,
      ac.nome_fantasia,
      ac.cnpj,
      ac.uf,
      ac.last_sync_at,
      ac.automatic_sync,
      coalesce(ds.documents,0)::integer documents,
      coalesce(ds.entries,0)::integer entries,
      coalesce(ds.exits,0)::integer exits,
      coalesce(ds.full_xml,0)::integer full_xml,
      coalesce(ds.pending_xml,0)::integer pending_xml,
      ac.certificate_until,
      case
        when ac.certificate_until is null then null
        else (ac.certificate_until-current_date)::integer
      end certificate_days,
      ac.purchase_status,
      ac.purchase_last_started_at,
      ac.purchase_last_completed_at,
      ac.purchase_last_error,
      ac.sales_status,
      ac.sales_last_started_at,
      ac.sales_last_completed_at,
      ac.sales_last_error,
      ac.sales_xml_pending,
      ac.sales_xml_failed,
      ac.fiscal_settings #>> '{extractor_initial_sync,queued_at}' initial_sync_queued_at,
      ac.fiscal_settings #>> '{extractor_initial_sync,period_from}' initial_sync_period_from,
      ac.fiscal_settings #>> '{extractor_initial_sync,period_to}' initial_sync_period_to
    from active_companies ac
    left join doc_stats ds on ds.company_id=ac.company_id
  ),
  days as (
    select gs::date calendar_day
    from generate_series(
      public.extractor_local_date()-29,
      public.extractor_local_date(),
      interval '1 day'
    ) gs
  ),
  daily_counts as (
    select
      (timezone('America/Sao_Paulo',issue_date))::date calendar_day,
      count(*)::integer documents
    from docs
    where issue_date >= ((public.extractor_local_date()-29)::timestamp at time zone 'America/Sao_Paulo')
    group by 1
  )
  select
    (select coalesce(jsonb_agg(to_jsonb(cr) order by cr.razao_social),'[]'::jsonb) from company_rows cr),
    jsonb_build_object(
      'documents',(select count(*)::integer from docs),
      'entries',(select count(*)::integer from docs where direction in ('entrada','inbound')),
      'exits',(select count(*)::integer from docs where direction in ('saida','outbound')),
      'value',(select coalesce(sum(value),0) from docs),
      'full_xml',(select count(*)::integer from docs where full_xml),
      'pending_xml',(select count(*)::integer from docs where not full_xml)
    ),
    jsonb_build_object(
      'nfe',(select count(*)::integer from docs where model='55'),
      'nfce',(select count(*)::integer from docs where model='65'),
      'nfse',(select count(*)::integer from docs where lower(coalesce(document_kind,''))='nfse' or lower(coalesce(model,'')) in ('nfse','nfs-e')),
      'other',(select count(*)::integer from docs where coalesce(model,'') not in ('55','65') and lower(coalesce(document_kind,''))<>'nfse' and lower(coalesce(model,'')) not in ('nfse','nfs-e'))
    ),
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('day',d.calendar_day,'documents',coalesce(dc.documents,0))
          order by d.calendar_day
        ),
        '[]'::jsonb
      )
      from days d
      left join daily_counts dc on dc.calendar_day=d.calendar_day
    )
  into v_companies,v_totals,v_models,v_daily;

  -- Snapshot document preview remains DF-e based, but is canonicalized too.
  select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.issue_date desc),'[]'::jsonb)
  into v_documents
  from (
    select distinct on (
      fc.id,
      coalesce(nullif(fd.access_key,''),'dfe:'||fd.id::text)
    )
      fd.id,
      fc.id company_id,
      coalesce(nullif(ec.profile_overrides->>'trade_name',''),fc.nome_fantasia) company_name,
      fc.razao_social company_legal_name,
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
        when fd.direction in ('saida','outbound') then nullif(fd.recipient_cnpj,'')
        else nullif(fd.issuer_name,'')
      end counterparty_name
    from public.extractor_companies ec
    join public.fiscal_companies fc on fc.id=ec.fiscal_company_id
    join public.fiscal_dfe_documents fd on fd.company_id=fc.id
    where ec.account_id=v_account.id
      and ec.status='active'
      and fd.document_kind<>'evento'
      and fd.issue_date>=v_from_ts
      and fd.issue_date<v_to_ts
    order by
      fc.id,
      coalesce(nullif(fd.access_key,''),'dfe:'||fd.id::text),
      (fd.full_xml=true and fd.xml is not null) desc,
      fd.updated_at desc,
      fd.received_at desc
    limit 200
  ) row_data;

  return jsonb_build_object(
    'account',jsonb_build_object(
      'id',v_account.id,
      'name',v_account.name,
      'plan_code',v_account.plan_code,
      'monthly_xml_limit',v_account.monthly_xml_limit,
      'base_lookback_days',v_account.base_lookback_days,
      'history_from',v_account.history_from,
      'allowed_from',v_allowed_from
    ),
    'companies',v_companies,
    'documents',v_documents,
    'totals',v_totals,
    'models',v_models,
    'daily',v_daily
  );
end;
$function$;

revoke execute on function public.extractor_workspace_snapshot() from public, anon;
grant execute on function public.extractor_workspace_snapshot() to authenticated;
