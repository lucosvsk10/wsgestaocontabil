-- Extrator: enforce one standard history window everywhere:
-- previous full calendar month + current month through today's Brazil-local date.
-- Also make DF-e storage idempotent by company/environment/access key so repeated
-- NSUs cannot inflate document counts for new or existing companies.

create or replace function public.extractor_effective_history_start(
  p_history_from date,
  p_base_lookback_days integer
)
returns date
language sql
stable
set search_path to ''
as $function$
  select public.extractor_minimum_history_start();
$function$;

comment on function public.extractor_effective_history_start(date,integer) is
  'Extrator history always starts on day 1 of the previous calendar month. Legacy account lookback fields are intentionally ignored.';

-- The old day-count trigger is no longer part of the access rule.
drop trigger if exists trg_ensure_extractor_minimum_lookback on public.extractor_accounts;

create or replace function public.extractor_refresh_history_window()
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_start date := public.extractor_minimum_history_start();
  v_today date := public.extractor_local_date();
  v_start_month text := to_char(v_start,'YYMM');
  v_count integer := 0;
begin
  update public.fiscal_companies fc
  set fiscal_settings =
        coalesce(fc.fiscal_settings,'{}'::jsonb)
        || jsonb_build_object(
          'history_window_mode','previous_full_month_plus_current',
          'history_start_date',v_start::text,
          'history_window_refreshed_at',now()
        ),
      updated_at=now()
  where exists (
    select 1
    from public.extractor_companies ec
    where ec.fiscal_company_id=fc.id
      and ec.status='active'
  )
    and (
      coalesce(fc.fiscal_settings->>'history_window_mode','') <> 'previous_full_month_plus_current'
      or coalesce(fc.fiscal_settings->>'history_start_date','') <> v_start::text
    );

  get diagnostics v_count = row_count;

  update public.fiscal_sales_sync_state ss
  set
    backfill_days=(v_today-v_start+1),
    history_start_month=v_start_month,
    initial_backfill_done=case
      when coalesce(ss.history_start_month,'') <> v_start_month then false
      else ss.initial_backfill_done
    end,
    reconciliation_complete=case
      when coalesce(ss.history_start_month,'') <> v_start_month then false
      else ss.reconciliation_complete
    end,
    status=case
      when coalesce(ss.history_start_month,'') <> v_start_month
           and ss.status not in ('running','reconciling')
      then 'queued'
      else ss.status
    end,
    next_scheduled_at=case
      when coalesce(ss.history_start_month,'') <> v_start_month
           and ss.status not in ('running','reconciling')
      then now()
      else ss.next_scheduled_at
    end,
    updated_at=case
      when coalesce(ss.history_start_month,'') <> v_start_month
        or coalesce(ss.backfill_days,0) <> (v_today-v_start+1)
      then now()
      else ss.updated_at
    end
  where exists (
    select 1
    from public.extractor_companies ec
    where ec.fiscal_company_id=ss.company_id
      and ec.status='active'
      and coalesce(ec.automatic_sync,true)=true
  );

  return v_count;
end;
$function$;

revoke execute on function public.extractor_refresh_history_window() from public, anon, authenticated;
grant execute on function public.extractor_refresh_history_window() to service_role;

-- Apply the standard window immediately to every currently linked company.
select public.extractor_refresh_history_window();

-- Refresh the rolling month boundary every day shortly after midnight in Brazil.
do $block$
declare
  v_job bigint;
begin
  for v_job in
    select jobid from cron.job where jobname='extractor-refresh-history-window'
  loop
    perform cron.unschedule(v_job);
  end loop;
exception when undefined_table then
  null;
end
$block$;

select cron.schedule(
  'extractor-refresh-history-window',
  '15 3 * * *',
  'select public.extractor_refresh_history_window();'
);

-- Canonicalize historical DF-e rows before enforcing idempotency.
create temporary table extractor_dfe_duplicates on commit drop as
with ranked as (
  select
    fd.id,
    first_value(fd.id) over (
      partition by fd.company_id,fd.environment,fd.access_key
      order by
        (fd.full_xml=true and fd.xml is not null) desc,
        (fd.document_kind='nfe') desc,
        fd.updated_at desc nulls last,
        fd.received_at desc nulls last,
        fd.id
    ) keeper_id,
    row_number() over (
      partition by fd.company_id,fd.environment,fd.access_key
      order by
        (fd.full_xml=true and fd.xml is not null) desc,
        (fd.document_kind='nfe') desc,
        fd.updated_at desc nulls last,
        fd.received_at desc nulls last,
        fd.id
    ) rn
  from public.fiscal_dfe_documents fd
  where fd.company_id is not null
    and fd.access_key is not null
    and fd.access_key<>''
    and fd.document_kind<>'evento'
)
select id duplicate_id,keeper_id
from ranked
where rn>1;

-- Preserve recovery references while merging duplicate document identities.
delete from public.fiscal_document_recovery_items ri
using extractor_dfe_duplicates d
where ri.document_id=d.duplicate_id
  and exists (
    select 1
    from public.fiscal_document_recovery_items keep
    where keep.run_id=ri.run_id
      and keep.document_id=d.keeper_id
  );

update public.fiscal_document_recovery_items ri
set document_id=d.keeper_id,
    updated_at=now()
from extractor_dfe_duplicates d
where ri.document_id=d.duplicate_id;

delete from public.fiscal_dfe_documents fd
using extractor_dfe_duplicates d
where fd.id=d.duplicate_id;

drop index if exists public.fiscal_dfe_documents_company_environment_access_key_uidx;
create unique index fiscal_dfe_documents_company_environment_access_key_uidx
  on public.fiscal_dfe_documents(company_id,environment,access_key);

-- Return canonical documents directly from the RPC too; the browser should not
-- need to repair duplicate storage semantics.
create or replace function public.extractor_company_documents(
  _company_id uuid,
  _start date default public.extractor_minimum_history_start(),
  _end date default public.extractor_local_date()
)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  v_account public.extractor_accounts%rowtype;
  v_allowed_from date := public.extractor_minimum_history_start();
  v_from date;
  v_to date;
  v_from_ts timestamptz;
  v_to_exclusive_ts timestamptz;
  v_documents jsonb := '[]'::jsonb;
  v_reconciliation jsonb := '[]'::jsonb;
  v_last_sync timestamptz;
begin
  if _company_id is null then
    raise exception 'extractor_company_required' using errcode='22023';
  end if;
  if _start is null or _end is null or _start>_end then
    raise exception 'extractor_period_invalid' using errcode='22023';
  end if;

  select ea.* into v_account
  from public.extractor_accounts ea
  join public.extractor_companies ec on ec.account_id=ea.id
  where ec.fiscal_company_id=_company_id
    and ec.status='active'
    and private.is_extractor_member(ea.id,auth.uid())
  order by ea.created_at
  limit 1;

  if v_account.id is null then
    raise exception 'extractor_company_access_denied' using errcode='42501';
  end if;

  v_from := greatest(_start,v_allowed_from);
  v_to := least(_end,public.extractor_local_date());
  v_from_ts := (v_from::timestamp at time zone 'America/Sao_Paulo');
  v_to_exclusive_ts := ((v_to+1)::timestamp at time zone 'America/Sao_Paulo');

  select fc.last_sync_at into v_last_sync
  from public.fiscal_companies fc
  where fc.id=_company_id;

  select coalesce(
    jsonb_agg(to_jsonb(d) order by d.issue_date desc nulls last,d.received_at desc),
    '[]'::jsonb
  )
  into v_documents
  from (
    select distinct on (
      coalesce(nullif(fd.access_key,''),'dfe:'||fd.id::text)
    )
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
    where fd.company_id=_company_id
      and (
        (fd.issue_date is not null and fd.issue_date>=v_from_ts and fd.issue_date<v_to_exclusive_ts)
        or
        (fd.issue_date is null and fd.received_at>=v_from_ts and fd.received_at<v_to_exclusive_ts)
      )
    order by
      coalesce(nullif(fd.access_key,''),'dfe:'||fd.id::text),
      (fd.full_xml=true and fd.xml is not null) desc,
      (fd.document_kind='nfe') desc,
      fd.updated_at desc nulls last,
      fd.received_at desc
    limit 5000
  ) d;

  select coalesce(
    jsonb_agg(to_jsonb(r) order by r.issue_date desc nulls last,r.note_number desc),
    '[]'::jsonb
  )
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
    where sr.company_id=_company_id
      and sr.issue_date is not null
      and sr.issue_date>=v_from_ts
      and sr.issue_date<v_to_exclusive_ts
    order by sr.issue_date desc nulls last,sr.note_number desc
    limit 5000
  ) r;

  return jsonb_build_object(
    'ok',true,
    'company_id',_company_id,
    'allowed_from',v_allowed_from,
    'requested_from',_start,
    'effective_from',v_from,
    'effective_to',v_to,
    'last_sync_at',v_last_sync,
    'documents',v_documents,
    'reconciliation',v_reconciliation
  );
end;
$function$;

revoke execute on function public.extractor_company_documents(uuid,date,date) from public,anon;
grant execute on function public.extractor_company_documents(uuid,date,date) to authenticated;

create or replace function public.extractor_document_access(p_user_id uuid,p_company_id uuid)
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
      'from',public.extractor_minimum_history_start(),
      'to',public.extractor_local_date()
    );
  end if;

  return jsonb_build_object('allowed',false);
end;
$function$;
