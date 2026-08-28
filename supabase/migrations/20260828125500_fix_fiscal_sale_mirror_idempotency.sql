-- Keep one outgoing DFe row per access key and make the sales mirror idempotent.
with ranked as (
  select id,
         row_number() over (
           partition by user_id, cnpj, environment, uf_code, access_key
           order by full_xml desc,
                    (nsu like 'SAIDA-%') desc,
                    updated_at desc,
                    created_at desc
         ) as rn
  from public.fiscal_dfe_documents
  where direction='saida' and access_key is not null and access_key<>''
), losers as (
  select id from ranked where rn>1
)
delete from public.fiscal_dfe_documents d
using losers l
where d.id=l.id;

update public.fiscal_dfe_documents
set nsu='SAIDA-'||access_key,
    updated_at=now()
where direction='saida'
  and access_key is not null and access_key<>''
  and nsu is distinct from 'SAIDA-'||access_key;

create or replace function public.mirror_fiscal_sale_to_dfe()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_cnpj text;
  v_name text;
  v_uf_code text;
  v_nsu text;
begin
  select created_by, cnpj, razao_social,
         case upper(coalesce(uf,'')) when 'AL' then '27' else null end
    into v_user_id, v_cnpj, v_name, v_uf_code
  from public.fiscal_companies
  where id = new.company_id;

  if v_user_id is null or v_cnpj is null or coalesce(new.access_key,'')='' then
    return new;
  end if;

  v_nsu := 'SAIDA-' || new.access_key;

  insert into public.fiscal_dfe_documents (
    user_id, company_id, cnpj, environment, uf_code, nsu,
    source, source_id, schema_name, document_kind, direction,
    access_key, model, issue_date, value, issuer_cnpj, issuer_name,
    recipient_cnpj, note_number, series, status_code, status_text,
    full_xml, xml, authorized_at, updated_at
  ) values (
    v_user_id, new.company_id, v_cnpj, 'producao', v_uf_code, v_nsu,
    coalesce(new.source,'state_sales'), new.access_key,
    case when new.xml is not null and length(new.xml)>0 then 'procNFe_v4.00' else 'sefaz_al_danfe_detail' end,
    case when new.xml is not null and length(new.xml)>0 then 'nfe' else 'documento' end,
    'saida', new.access_key, new.model, new.issue_date, new.total_value,
    v_cnpj, v_name, new.recipient_document, new.document_number, new.series,
    case when new.status ilike '%cancel%' then '101'
         when new.status ilike '%autoriza%' or new.status ilike '%found%' then '100'
         else null end,
    new.status, (new.xml is not null and length(new.xml)>0), new.xml,
    new.issue_date, now()
  )
  on conflict (user_id, cnpj, environment, uf_code, nsu)
  do update set
    company_id = excluded.company_id,
    direction = 'saida',
    access_key = excluded.access_key,
    model = coalesce(excluded.model, public.fiscal_dfe_documents.model),
    issue_date = coalesce(excluded.issue_date, public.fiscal_dfe_documents.issue_date),
    value = coalesce(excluded.value, public.fiscal_dfe_documents.value),
    issuer_cnpj = coalesce(excluded.issuer_cnpj, public.fiscal_dfe_documents.issuer_cnpj),
    issuer_name = coalesce(excluded.issuer_name, public.fiscal_dfe_documents.issuer_name),
    recipient_cnpj = coalesce(excluded.recipient_cnpj, public.fiscal_dfe_documents.recipient_cnpj),
    note_number = coalesce(excluded.note_number, public.fiscal_dfe_documents.note_number),
    series = coalesce(excluded.series, public.fiscal_dfe_documents.series),
    status_code = coalesce(excluded.status_code, public.fiscal_dfe_documents.status_code),
    status_text = coalesce(excluded.status_text, public.fiscal_dfe_documents.status_text),
    full_xml = public.fiscal_dfe_documents.full_xml or excluded.full_xml,
    xml = case when excluded.full_xml then excluded.xml else public.fiscal_dfe_documents.xml end,
    schema_name = case when excluded.full_xml then excluded.schema_name else public.fiscal_dfe_documents.schema_name end,
    document_kind = case when excluded.full_xml then excluded.document_kind else public.fiscal_dfe_documents.document_kind end,
    authorized_at = coalesce(excluded.authorized_at, public.fiscal_dfe_documents.authorized_at),
    updated_at = now();

  return new;
end;
$$;

revoke execute on function public.mirror_fiscal_sale_to_dfe() from public, anon, authenticated;
revoke execute on function public.trigger_fiscal_sales_cron() from public, anon, authenticated;
revoke execute on function public.trigger_fiscal_purchases_cron() from public, anon, authenticated;
alter function public.trigger_fiscal_purchases_cron() set search_path = public, extensions;
alter function public.reject_fiscal_dfe_event_rows() set search_path = public;

-- Repair sales-document XML fields that were previously skipped by the old mirror conflict.
update public.fiscal_sales_documents s
set xml=d.xml,
    source=case when s.source='sefaz_al_detail' then 'xml_backfill_svrs' else s.source end,
    updated_at=now()
from public.fiscal_dfe_documents d
where s.company_id=d.company_id
  and s.access_key=d.access_key
  and d.direction='saida'
  and d.full_xml=true
  and d.xml is not null
  and length(d.xml)>1000
  and (s.xml is null or length(s.xml)<=1000);
