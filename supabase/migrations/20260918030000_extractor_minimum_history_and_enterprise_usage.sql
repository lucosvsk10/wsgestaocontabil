-- Extrator: minimum fiscal history window (previous full calendar month + current),
-- member-preferred account selection, and Enterprise usage per company.

create or replace function public.extractor_minimum_history_start()
returns date
language sql
stable
set search_path to ''
as $function$
  select (date_trunc('month', current_date)::date - interval '1 month')::date;
$function$;

create or replace function public.extractor_effective_history_start(
  p_history_from date,
  p_base_lookback_days integer
)
returns date
language sql
stable
set search_path to ''
as $function$
  select greatest(
    least(
      coalesce(p_history_from, current_date - greatest(coalesce(p_base_lookback_days, 0), 0)),
      public.extractor_minimum_history_start()
    ),
    current_date - 366
  );
$function$;

-- Keep the stored account baseline safely above the dynamic calendar minimum.
create or replace function public.ensure_extractor_minimum_lookback()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  new.base_lookback_days := greatest(coalesce(new.base_lookback_days, 0), 62);
  return new;
end;
$function$;

drop trigger if exists trg_ensure_extractor_minimum_lookback on public.extractor_accounts;
create trigger trg_ensure_extractor_minimum_lookback
before insert or update of base_lookback_days
on public.extractor_accounts
for each row execute function public.ensure_extractor_minimum_lookback();

update public.extractor_accounts
set base_lookback_days = greatest(coalesce(base_lookback_days, 0), 62),
    updated_at = now()
where base_lookback_days is null or base_lookback_days < 62;

create or replace function public.extractor_workspace_snapshot()
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
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
  order by
    case when private.is_extractor_member(ea.id, auth.uid()) then 0 else 1 end,
    ea.created_at
  limit 1;

  if v_account.id is null then
    return null;
  end if;

  v_allowed_from := public.extractor_effective_history_start(
    v_account.history_from,
    v_account.base_lookback_days
  );

  select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.razao_social), '[]'::jsonb)
  into v_companies
  from (
    select
      fc.id,
      ec.id as extractor_company_id,
      fc.razao_social,
      coalesce(nullif(ec.profile_overrides->>'trade_name',''), fc.nome_fantasia) as nome_fantasia,
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
    group by fc.id, ec.id, ec.profile_overrides, ec.automatic_sync, cert.valid_until,
      ps.status, ps.last_completed_at, ps.last_error,
      ss.status, ss.last_completed_at, ss.last_error, ss.xml_pending, ss.xml_failed
  ) row_data;

  select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.issue_date desc), '[]'::jsonb)
  into v_documents
  from (
    select
      fd.id,
      fc.id as company_id,
      coalesce(nullif(ec.profile_overrides->>'trade_name',''), fc.nome_fantasia) as company_name,
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
$function$;

create or replace function public.extractor_company_documents(
  _company_id uuid,
  _start date default public.extractor_minimum_history_start(),
  _end date default current_date
)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  v_account public.extractor_accounts%rowtype;
  v_allowed_from date;
  v_from date;
  v_to date;
  v_documents jsonb := '[]'::jsonb;
  v_reconciliation jsonb := '[]'::jsonb;
  v_last_sync timestamptz;
begin
  if _company_id is null then
    raise exception 'extractor_company_required' using errcode = '22023';
  end if;
  if _start is null or _end is null or _start > _end then
    raise exception 'extractor_period_invalid' using errcode = '22023';
  end if;

  select ea.* into v_account
  from public.extractor_accounts ea
  join public.extractor_companies ec on ec.account_id = ea.id
  where ec.fiscal_company_id = _company_id
    and ec.status = 'active'
    and (
      private.is_extractor_member(ea.id, auth.uid())
      or private.is_any_admin(auth.uid())
    )
  order by
    case when private.is_extractor_member(ea.id, auth.uid()) then 0 else 1 end,
    ea.created_at
  limit 1;

  if v_account.id is null then
    raise exception 'extractor_company_access_denied' using errcode = '42501';
  end if;

  v_allowed_from := public.extractor_effective_history_start(
    v_account.history_from,
    v_account.base_lookback_days
  );
  v_from := greatest(_start, v_allowed_from);
  v_to := least(_end, current_date);

  select fc.last_sync_at into v_last_sync
  from public.fiscal_companies fc
  where fc.id = _company_id;

  select coalesce(jsonb_agg(to_jsonb(d) order by d.issue_date desc nulls last, d.received_at desc), '[]'::jsonb)
  into v_documents
  from (
    select
      fd.id,
      fd.company_id,
      fd.nsu,
      fd.schema_name,
      fd.source,
      fd.document_kind,
      fd.full_xml,
      fd.direction,
      fd.access_key,
      fd.model,
      fd.issue_date,
      fd.value,
      fd.issuer_cnpj,
      fd.issuer_name,
      fd.recipient_cnpj,
      fd.note_number,
      fd.series,
      fd.status_code,
      fd.status_text,
      fd.parse_error,
      fd.received_at
    from public.fiscal_dfe_documents fd
    where fd.company_id = _company_id
      and (
        (fd.issue_date is not null and fd.issue_date >= v_from::timestamptz and fd.issue_date < (v_to + 1)::timestamptz)
        or (fd.issue_date is null and fd.received_at >= v_from::timestamptz and fd.received_at < (v_to + 1)::timestamptz)
      )
    order by fd.issue_date desc nulls last, fd.received_at desc
    limit 5000
  ) d;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.issue_date desc nulls last, r.note_number desc), '[]'::jsonb)
  into v_reconciliation
  from (
    select
      sr.company_id,
      sr.model,
      sr.series,
      sr.note_number,
      sr.status,
      sr.access_key,
      sr.issue_date,
      sr.month_code,
      sr.cstat,
      sr.xmotivo,
      sr.xml_status,
      sr.detail_status,
      sr.event_status,
      sr.updated_at
    from public.fiscal_sales_reconciliation sr
    where sr.company_id = _company_id
      and sr.issue_date is not null
      and sr.issue_date >= v_from::timestamptz
      and sr.issue_date < (v_to + 1)::timestamptz
    order by sr.issue_date desc nulls last, sr.note_number desc
    limit 5000
  ) r;

  return jsonb_build_object(
    'ok', true,
    'company_id', _company_id,
    'allowed_from', v_allowed_from,
    'requested_from', _start,
    'effective_from', v_from,
    'effective_to', v_to,
    'last_sync_at', v_last_sync,
    'documents', v_documents,
    'reconciliation', v_reconciliation
  );
end;
$function$;

create or replace function public.extractor_document_access(p_user_id uuid, p_company_id uuid)
returns jsonb
language plpgsql
stable
set search_path to ''
as $function$
declare
  v_account public.extractor_accounts%rowtype;
begin
  if p_user_id is null or p_company_id is null then
    return jsonb_build_object('allowed',false);
  end if;

  -- Prefer the user's actual Extrator membership even when the same user also has a platform admin role.
  select ea.* into v_account
  from public.extractor_accounts ea
  join public.extractor_companies ec on ec.account_id=ea.id
  where ec.fiscal_company_id=p_company_id
    and ec.status='active'
    and private.is_extractor_member(ea.id,p_user_id)
  order by ea.created_at
  limit 1;

  if v_account.id is not null then
    return jsonb_build_object(
      'allowed',true,
      'from',public.extractor_effective_history_start(v_account.history_from,v_account.base_lookback_days),
      'to',current_date
    );
  end if;

  if private.is_any_admin(p_user_id) then
    return jsonb_build_object('allowed',true,'from',null,'to',current_date);
  end if;

  return jsonb_build_object('allowed',false);
end;
$function$;

create or replace function public.extractor_account_usage()
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  v_account public.extractor_accounts%rowtype;
  v_plan public.saas_plans%rowtype;
  v_used integer := 0;
  v_limit integer := 0;
  v_remaining integer := 0;
  v_percent integer := 0;
  v_per_company integer := 0;
  v_companies jsonb := '[]'::jsonb;
begin
  select ea.* into v_account
  from public.extractor_accounts ea
  where ea.status = 'active'
    and (private.is_extractor_member(ea.id, auth.uid()) or private.is_any_admin(auth.uid()))
  order by
    case when private.is_extractor_member(ea.id, auth.uid()) then 0 else 1 end,
    ea.created_at
  limit 1;

  if v_account.id is null then return null; end if;

  select p.* into v_plan
  from public.saas_plans p
  where p.code=v_account.plan_code
    and p.product_code='extractor'
    and p.status='active'
  limit 1;

  v_per_company := greatest(coalesce(nullif(v_plan.limits->>'monthly_xml_per_company','')::integer,0),0);

  if v_per_company > 0 then
    with active_companies as (
      select
        ec.id extractor_company_id,
        ec.fiscal_company_id,
        coalesce(nullif(ec.profile_overrides->>'trade_name',''),fc.nome_fantasia,fc.razao_social) company_name,
        fc.razao_social legal_name,
        fc.cnpj
      from public.extractor_companies ec
      join public.fiscal_companies fc on fc.id=ec.fiscal_company_id
      where ec.account_id=v_account.id and ec.status='active'
    ),
    document_identities as (
      select
        ac.fiscal_company_id company_id,
        coalesce(nullif(fd.access_key,''),'dfe:'||fd.id::text) identity
      from active_companies ac
      join public.fiscal_dfe_documents fd on fd.company_id=ac.fiscal_company_id
      where fd.document_kind<>'evento'
        and fd.full_xml=true
        and fd.xml is not null
        and fd.issue_date>=v_account.current_period_start
        and fd.issue_date<(v_account.current_period_start+interval '1 month')
      union
      select
        ac.fiscal_company_id company_id,
        coalesce(nullif(sd.access_key,''),'sale:'||sd.id::text) identity
      from active_companies ac
      join public.fiscal_sales_documents sd on sd.company_id=ac.fiscal_company_id
      where sd.xml is not null
        and sd.issue_date>=v_account.current_period_start
        and sd.issue_date<(v_account.current_period_start+interval '1 month')
    ),
    per_company as (
      select
        ac.fiscal_company_id company_id,
        ac.company_name,
        ac.legal_name,
        ac.cnpj,
        count(di.identity)::integer used
      from active_companies ac
      left join document_identities di on di.company_id=ac.fiscal_company_id
      group by ac.fiscal_company_id,ac.company_name,ac.legal_name,ac.cnpj
    )
    select
      coalesce(sum(pc.used),0)::integer,
      coalesce(jsonb_agg(
        jsonb_build_object(
          'company_id',pc.company_id,
          'name',pc.company_name,
          'legal_name',pc.legal_name,
          'cnpj',pc.cnpj,
          'used',pc.used,
          'limit',v_per_company,
          'remaining',greatest(v_per_company-pc.used,0),
          'percent',case
            when pc.used>0 then least(100,greatest(1,ceil((pc.used::numeric/v_per_company::numeric)*100)::integer))
            else 0
          end
        )
        order by pc.company_name
      ),'[]'::jsonb)
    into v_used,v_companies
    from per_company pc;

    v_limit := jsonb_array_length(v_companies) * v_per_company;
    v_remaining := greatest(v_limit-v_used,0);
    v_percent := case
      when v_limit>0 and v_used>0 then least(100,greatest(1,ceil((v_used::numeric/v_limit::numeric)*100)::integer))
      else 0
    end;

    return jsonb_build_object(
      'mode','per_company',
      'used',v_used,
      'limit',v_limit,
      'remaining',v_remaining,
      'percent',v_percent,
      'per_company_limit',v_per_company,
      'companies',v_companies,
      'period_start',v_account.current_period_start,
      'period_end',(v_account.current_period_start+interval '1 month - 1 day')::date
    );
  end if;

  select count(*)::integer into v_used
  from (
    select distinct
      ec.id as extractor_company_id,
      coalesce(nullif(fd.access_key,''),fd.id::text) as document_identity
    from public.extractor_companies ec
    join public.fiscal_dfe_documents fd on fd.company_id = ec.fiscal_company_id
    where ec.account_id = v_account.id
      and ec.status = 'active'
      and fd.document_kind <> 'evento'
      and fd.full_xml = true
      and fd.xml is not null
      and fd.issue_date >= v_account.current_period_start
      and fd.issue_date < (v_account.current_period_start + interval '1 month')
  ) unique_documents;

  v_limit := greatest(coalesce(v_account.monthly_xml_limit, 0), 0);
  v_remaining := greatest(v_limit - v_used, 0);
  v_percent := case
    when v_limit > 0 and v_used > 0 then least(100, greatest(1, ceil((v_used::numeric / v_limit::numeric) * 100)::integer))
    else 0
  end;

  return jsonb_build_object(
    'mode','aggregate',
    'used', v_used,
    'limit', v_limit,
    'remaining', v_remaining,
    'percent', v_percent,
    'companies','[]'::jsonb,
    'period_start', v_account.current_period_start,
    'period_end', (v_account.current_period_start + interval '1 month - 1 day')::date
  );
end;
$function$;

-- Ensure every linked extractor company carries the calendar-window rule.
update public.fiscal_companies fc
set fiscal_settings =
  coalesce(fc.fiscal_settings,'{}'::jsonb)
  || jsonb_build_object(
    'history_window_mode','previous_full_month_plus_current',
    'history_start_date',
      least(
        case
          when coalesce(fc.fiscal_settings->>'history_start_date','') ~ '^\d{4}-\d{2}-\d{2}$'
            then (fc.fiscal_settings->>'history_start_date')::date
          else public.extractor_minimum_history_start()
        end,
        public.extractor_minimum_history_start()
      )::text,
    'history_window_refreshed_at',now()
  ),
  updated_at=now()
where exists (
  select 1
  from public.extractor_companies ec
  where ec.fiscal_company_id=fc.id and ec.status='active'
);

-- Expand/queue existing sync state without shortening any older configured history.
update public.fiscal_purchase_sync_state ps
set
  paused=false,
  status=case when ps.status='running' then 'running' else 'queued' end,
  next_scheduled_at=now(),
  last_error=case when ps.status='waiting_certificate' then ps.last_error else null end,
  updated_at=now()
where exists (
  select 1 from public.extractor_companies ec
  where ec.fiscal_company_id=ps.company_id
    and ec.status='active'
    and coalesce(ec.automatic_sync,true)=true
);

update public.fiscal_sales_sync_state ss
set
  backfill_days=greatest(
    coalesce(ss.backfill_days,0),
    (current_date-public.extractor_minimum_history_start())::integer
  ),
  history_start_month=case
    when ss.history_start_month is null
      or ss.history_start_month > to_char(public.extractor_minimum_history_start(),'YYMM')
    then to_char(public.extractor_minimum_history_start(),'YYMM')
    else ss.history_start_month
  end,
  initial_backfill_done=case
    when ss.history_start_month is null
      or ss.history_start_month > to_char(public.extractor_minimum_history_start(),'YYMM')
    then false
    else ss.initial_backfill_done
  end,
  reconciliation_complete=case
    when ss.history_start_month is null
      or ss.history_start_month > to_char(public.extractor_minimum_history_start(),'YYMM')
    then false
    else ss.reconciliation_complete
  end,
  status=case
    when ss.status in ('running','reconciling','bootstrap_window') then ss.status
    when exists (
      select 1 from public.fiscal_state_credentials cred
      where cred.company_id=ss.company_id and cred.uf='AL' and cred.is_active=true
    ) then 'queued'
    else 'waiting_state_credentials'
  end,
  next_scheduled_at=now(),
  updated_at=now()
where exists (
  select 1 from public.extractor_companies ec
  where ec.fiscal_company_id=ss.company_id
    and ec.status='active'
    and coalesce(ec.automatic_sync,true)=true
);

-- Queue dispatchers immediately; their normal cron cadence continues afterward.
select public.trigger_fiscal_purchases_cron();
select public.trigger_fiscal_sales_cron();
