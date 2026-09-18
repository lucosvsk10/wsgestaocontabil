-- Extrator preview: direct, tenant-scoped access to XML already stored in the database.
-- This is the source used by the UI preview before any recovery/network attempt.

create or replace function public.extractor_document_preview_data(
  _company_id uuid,
  _access_key text default null,
  _nsu text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_account public.extractor_accounts%rowtype;
  v_allowed_from date;
  v_local_today date := public.extractor_local_date();
  v_key text := regexp_replace(coalesce(_access_key,''),'\D','','g');
  v_nsu text := nullif(trim(coalesce(_nsu,'')),'');
  v_doc public.fiscal_dfe_documents%rowtype;
  v_any public.fiscal_dfe_documents%rowtype;
  v_sale public.fiscal_sales_documents%rowtype;
  v_company public.fiscal_companies%rowtype;
  v_doc_date date;
begin
  if _company_id is null or (v_key='' and v_nsu is null) then
    raise exception 'extractor_document_invalid' using errcode='22023';
  end if;

  select ea.* into v_account
  from public.extractor_accounts ea
  join public.extractor_companies ec on ec.account_id=ea.id
  where ec.fiscal_company_id=_company_id
    and ec.status='active'
    and (
      private.is_extractor_member(ea.id,auth.uid())
      or private.is_any_admin(auth.uid())
    )
  order by
    case when private.is_extractor_member(ea.id,auth.uid()) then 0 else 1 end,
    ea.created_at
  limit 1;

  if v_account.id is null then
    raise exception 'extractor_company_access_denied' using errcode='42501';
  end if;

  v_allowed_from := public.extractor_effective_history_start(
    v_account.history_from,
    v_account.base_lookback_days
  );

  select fd.* into v_doc
  from public.fiscal_dfe_documents fd
  where fd.company_id=_company_id
    and (
      (v_key<>'' and regexp_replace(coalesce(fd.access_key,''),'\D','','g')=v_key)
      or (v_key='' and v_nsu is not null and fd.nsu=v_nsu)
    )
    and fd.full_xml=true
    and fd.xml is not null
    and length(fd.xml)>200
  order by fd.updated_at desc, fd.received_at desc
  limit 1;

  if v_doc.id is not null then
    v_doc_date := (timezone('America/Sao_Paulo',coalesce(v_doc.issue_date,v_doc.received_at)))::date;
    if v_doc_date between v_allowed_from and v_local_today then
      return jsonb_build_object(
        'ok',true,
        'ready',true,
        'source','fiscal_dfe_documents',
        'document',to_jsonb(v_doc)
      );
    end if;
  end if;

  -- Outbound XML can exist first in the dedicated sales table.
  if v_key<>'' then
    select sd.* into v_sale
    from public.fiscal_sales_documents sd
    where sd.company_id=_company_id
      and regexp_replace(coalesce(sd.access_key,''),'\D','','g')=v_key
      and sd.xml is not null
      and length(sd.xml)>200
    order by sd.updated_at desc
    limit 1;

    if v_sale.id is not null then
      v_doc_date := (timezone('America/Sao_Paulo',v_sale.issue_date))::date;
      if v_doc_date between v_allowed_from and v_local_today then
        select * into v_company
        from public.fiscal_companies
        where id=_company_id;

        return jsonb_build_object(
          'ok',true,
          'ready',true,
          'source','fiscal_sales_documents',
          'document',jsonb_build_object(
            'id',v_sale.id,
            'company_id',_company_id,
            'nsu',null,
            'schema_name','procNFe_v4.00',
            'source',coalesce(v_sale.source,'fiscal_sales_documents'),
            'document_kind','nfe',
            'full_xml',true,
            'xml',v_sale.xml,
            'direction','saida',
            'access_key',v_sale.access_key,
            'model',coalesce(v_sale.model,case when length(v_key)=44 then substr(v_key,21,2) end),
            'issue_date',v_sale.issue_date,
            'value',v_sale.total_value,
            'issuer_cnpj',v_company.cnpj,
            'issuer_name',coalesce(v_company.razao_social,v_company.nome_fantasia),
            'recipient_cnpj',v_sale.recipient_document,
            'recipient_name',v_sale.recipient_name,
            'note_number',v_sale.document_number,
            'series',v_sale.series,
            'status_code',case when lower(coalesce(v_sale.status,'')) like '%cancel%' then '101' else '100' end,
            'status_text',coalesce(v_sale.status,'Autorizada'),
            'parse_error',null,
            'received_at',v_sale.updated_at,
            'updated_at',v_sale.updated_at
          )
        );
      end if;
    end if;
  end if;

  -- Return the best stored summary only to explain legitimate pending XML cases.
  select fd.* into v_any
  from public.fiscal_dfe_documents fd
  where fd.company_id=_company_id
    and (
      (v_key<>'' and regexp_replace(coalesce(fd.access_key,''),'\D','','g')=v_key)
      or (v_key='' and v_nsu is not null and fd.nsu=v_nsu)
    )
  order by fd.full_xml desc, fd.updated_at desc, fd.received_at desc
  limit 1;

  if v_any.id is not null then
    v_doc_date := (timezone('America/Sao_Paulo',coalesce(v_any.issue_date,v_any.received_at)))::date;
    if v_doc_date < v_allowed_from or v_doc_date > v_local_today then
      return jsonb_build_object(
        'ok',true,
        'ready',false,
        'reason','Documento fora do período liberado para esta conta.',
        'code','OUTSIDE_PERIOD'
      );
    end if;

    return jsonb_build_object(
      'ok',true,
      'ready',false,
      'requires_manifestation',coalesce(v_any.parse_error,'')='xml_requires_manifestation',
      'reason',case
        when coalesce(v_any.parse_error,'')='xml_requires_manifestation'
          then 'A SEFAZ exige manifestação do destinatário antes de liberar o XML integral.'
        else 'XML integral ainda não disponível.'
      end,
      'document',to_jsonb(v_any)
    );
  end if;

  return jsonb_build_object(
    'ok',true,
    'ready',false,
    'reason','Documento não encontrado para esta empresa.',
    'code','NOT_FOUND'
  );
end;
$function$;

revoke all on function public.extractor_document_preview_data(uuid,text,text) from public,anon;
grant execute on function public.extractor_document_preview_data(uuid,text,text) to authenticated;
