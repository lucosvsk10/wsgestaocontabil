-- Keep the document table and the workspace counters on the same canonical feed.
-- Sales discovered by the state engines can live in fiscal_sales_documents before
-- the DF-e mirror arrives, so they must also be visible in Documents.

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

  with raw as (
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
      case when fd.issue_date is null and fd.access_key ~ '^[0-9]{44}$' then 'month_from_access_key' else 'exact' end as date_precision,
      fd.value,
      fd.issuer_cnpj,
      fd.issuer_name,
      fd.recipient_cnpj,
      fd.recipient_name,
      fd.note_number,
      fd.series,
      fd.status_code,
      fd.status_text,
      fd.parse_error,
      fd.received_at,
      fd.updated_at,
      2 as source_rank
    from public.fiscal_dfe_documents fd
    where fd.company_id=_company_id
      and (
        (fd.issue_date is not null and fd.issue_date>=v_from_ts and fd.issue_date<v_to_exclusive_ts)
        or
        (fd.issue_date is null and ((fd.access_key ~ '^[0-9]{44}$' and substring(fd.access_key from 3 for 4) between to_char(v_from,'YYMM') and to_char(v_to,'YYMM')) or ((fd.access_key is null or fd.access_key !~ '^[0-9]{44}$') and fd.received_at>=v_from_ts and fd.received_at<v_to_exclusive_ts)))
      )

    union all

    select
      sd.id,
      sd.company_id,
      null::text as nsu,
      case when sd.model='65' then 'procNFe_4.00' else 'procNFe_4.00' end::text as schema_name,
      coalesce(sd.source,'fiscal_sales_documents') as source,
      'nfe'::text as document_kind,
      (sd.xml is not null and btrim(sd.xml)<>'') as full_xml,
      'saida'::text as direction,
      sd.access_key,
      sd.model,
      sd.issue_date,
      case when sd.issue_date is null and sd.access_key ~ '^[0-9]{44}$' then 'month_from_access_key' else 'exact' end as date_precision,
      sd.total_value as value,
      fc.cnpj as issuer_cnpj,
      fc.razao_social as issuer_name,
      sd.recipient_document as recipient_cnpj,
      sd.recipient_name,
      sd.document_number as note_number,
      sd.series,
      null::text as status_code,
      sd.status as status_text,
      nullif(sd.source_reference->>'xml_last_error','') as parse_error,
      sd.first_seen_at as received_at,
      sd.updated_at,
      1 as source_rank
    from public.fiscal_sales_documents sd
    join public.fiscal_companies fc on fc.id=sd.company_id
    where sd.company_id=_company_id
      and (
        (sd.issue_date is not null and sd.issue_date>=v_from_ts and sd.issue_date<v_to_exclusive_ts)
        or
        (sd.issue_date is null and ((sd.access_key ~ '^[0-9]{44}$' and substring(sd.access_key from 3 for 4) between to_char(v_from,'YYMM') and to_char(v_to,'YYMM')) or ((sd.access_key is null or sd.access_key !~ '^[0-9]{44}$') and sd.first_seen_at>=v_from_ts and sd.first_seen_at<v_to_exclusive_ts)))
      )
  ), ranked as (
    select raw.*,
      row_number() over (
        partition by coalesce(nullif(raw.access_key,''),raw.source||':'||raw.id::text)
        order by
          (raw.value is not null) desc,
          raw.full_xml desc,
          raw.source_rank desc,
          raw.updated_at desc nulls last,
          raw.received_at desc
      ) as canonical_rank
    from raw
  )
  select coalesce(
    jsonb_agg(to_jsonb(d) - 'source_rank' - 'updated_at' - 'canonical_rank' order by d.issue_date desc nulls last,d.received_at desc),
    '[]'::jsonb
  )
  into v_documents
  from (
    select * from ranked
    where canonical_rank=1
    order by issue_date desc nulls last,received_at desc
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
