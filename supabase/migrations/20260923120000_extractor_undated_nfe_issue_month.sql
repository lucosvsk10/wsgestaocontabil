-- An undated NF-e belongs to the issue month encoded in its official access key,
-- never to the month when the scanner happened to receive it.
-- The exact issue date stays null until an official XML/detail confirms it.

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
      case when fd.issue_date is null and fd.access_key ~ '^[0-9]{44}$' then 'month_from_access_key' else 'exact' end as date_precision,
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
        (fd.issue_date is null and ((fd.access_key ~ '^[0-9]{44}$' and substring(fd.access_key from 3 for 4) between to_char(v_from,'YYMM') and to_char(v_to,'YYMM')) or ((fd.access_key is null or fd.access_key !~ '^[0-9]{44}$') and fd.received_at>=v_from_ts and fd.received_at<v_to_exclusive_ts)))
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
