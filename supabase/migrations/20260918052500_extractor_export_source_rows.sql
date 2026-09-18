-- Reliable export source for the Extrator.
-- Uses the same tenant access function and Brazil-local date semantics as the UI,
-- and merges DFe + dedicated sales documents before export.

create or replace function public.extractor_export_rows(
  p_user_id uuid,
  p_company_ids uuid[],
  p_start date,
  p_end date,
  p_direction text default 'todos',
  p_include_xml boolean default false
)
returns setof jsonb
language sql
stable
security definer
set search_path to ''
as $function$
with requested as (
  select
    fc.id company_id,
    fc.cnpj company_cnpj,
    fc.razao_social company_name,
    fc.nome_fantasia company_trade_name,
    public.extractor_document_access(p_user_id, fc.id) access
  from public.fiscal_companies fc
  where fc.id = any(coalesce(p_company_ids, array[]::uuid[]))
),
allowed as (
  select
    r.*,
    nullif(r.access->>'from','')::date access_from,
    nullif(r.access->>'to','')::date access_to
  from requested r
  where coalesce((r.access->>'allowed')::boolean,false)=true
),
raw as (
  select
    fd.id,
    a.company_id,
    a.company_cnpj,
    a.company_name,
    a.company_trade_name,
    fd.nsu,
    fd.schema_name,
    fd.source,
    fd.document_kind,
    coalesce(fd.full_xml,false) full_xml,
    fd.direction,
    fd.access_key,
    fd.model,
    fd.issue_date,
    fd.value,
    fd.issuer_cnpj,
    fd.issuer_name,
    fd.recipient_cnpj,
    null::text recipient_name,
    fd.note_number,
    fd.series,
    fd.status_code,
    fd.status_text,
    case when p_include_xml then fd.xml else null end xml,
    fd.parse_error,
    fd.updated_at,
    1 source_rank
  from allowed a
  join public.fiscal_dfe_documents fd on fd.company_id=a.company_id
  where fd.document_kind<>'evento'
    and timezone('America/Sao_Paulo',fd.issue_date)::date
      between greatest(p_start,coalesce(a.access_from,p_start))
          and least(p_end,coalesce(a.access_to,p_end))
    and (
      p_direction='todos'
      or (p_direction='entrada' and fd.direction in ('entrada','inbound'))
      or (p_direction='saida' and fd.direction in ('saida','outbound'))
    )

  union all

  select
    sd.id,
    a.company_id,
    a.company_cnpj,
    a.company_name,
    a.company_trade_name,
    null::text nsu,
    'procNFe_v4.00'::text schema_name,
    coalesce(sd.source,'fiscal_sales_documents') source,
    'nfe'::text document_kind,
    (sd.xml is not null and length(sd.xml)>80) full_xml,
    'saida'::text direction,
    sd.access_key,
    sd.model,
    sd.issue_date,
    sd.total_value value,
    a.company_cnpj issuer_cnpj,
    coalesce(a.company_name,a.company_trade_name) issuer_name,
    sd.recipient_document recipient_cnpj,
    sd.recipient_name,
    sd.document_number note_number,
    sd.series,
    case when lower(coalesce(sd.status,'')) like '%cancel%' then '101' else '100' end status_code,
    coalesce(sd.status,'Autorizada') status_text,
    case when p_include_xml then sd.xml else null end xml,
    null::text parse_error,
    sd.updated_at,
    0 source_rank
  from allowed a
  join public.fiscal_sales_documents sd on sd.company_id=a.company_id
  where timezone('America/Sao_Paulo',sd.issue_date)::date
      between greatest(p_start,coalesce(a.access_from,p_start))
          and least(p_end,coalesce(a.access_to,p_end))
    and p_direction in ('todos','saida')
),
ranked as (
  select
    raw.*,
    row_number() over (
      partition by raw.company_id, coalesce(nullif(raw.access_key,''),nullif(raw.nsu,''),raw.id::text)
      order by raw.full_xml desc, raw.source_rank asc, raw.updated_at desc nulls last
    ) rn
  from raw
)
select jsonb_build_object(
  'id',id,
  'company_id',company_id,
  'company_cnpj',company_cnpj,
  'company_name',company_name,
  'company_trade_name',company_trade_name,
  'nsu',nsu,
  'schema_name',schema_name,
  'source',source,
  'document_kind',document_kind,
  'full_xml',full_xml,
  'direction',direction,
  'access_key',access_key,
  'model',model,
  'issue_date',issue_date,
  'value',value,
  'issuer_cnpj',issuer_cnpj,
  'issuer_name',issuer_name,
  'recipient_cnpj',recipient_cnpj,
  'recipient_name',recipient_name,
  'note_number',note_number,
  'series',series,
  'status_code',status_code,
  'status_text',status_text,
  'xml',xml,
  'parse_error',parse_error
)
from ranked
where rn=1
order by issue_date asc;
$function$;

revoke all on function public.extractor_export_rows(uuid,uuid[],date,date,text,boolean) from public,anon;
grant execute on function public.extractor_export_rows(uuid,uuid[],date,date,text,boolean) to authenticated,service_role;
