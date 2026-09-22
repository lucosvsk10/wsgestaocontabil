create or replace function public.mirror_fiscal_sale_to_dfe()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid;
  v_cnpj text;
  v_name text;
  v_uf_code text;
  v_environment text;
  v_nsu text;
begin
  select
    created_by,
    regexp_replace(cnpj, '\D', '', 'g'),
    razao_social,
    case upper(coalesce(uf,''))
      when 'AC' then '12' when 'AL' then '27' when 'AP' then '16' when 'AM' then '13'
      when 'BA' then '29' when 'CE' then '23' when 'DF' then '53' when 'ES' then '32'
      when 'GO' then '52' when 'MA' then '21' when 'MT' then '51' when 'MS' then '50'
      when 'MG' then '31' when 'PA' then '15' when 'PB' then '25' when 'PR' then '41'
      when 'PE' then '26' when 'PI' then '22' when 'RJ' then '33' when 'RN' then '24'
      when 'RS' then '43' when 'RO' then '11' when 'RR' then '14' when 'SC' then '42'
      when 'SP' then '35' when 'SE' then '28' when 'TO' then '17' else null
    end,
    case when ambiente_padrao = 'homologacao' then 'homologacao' else 'producao' end
  into v_user_id, v_cnpj, v_name, v_uf_code, v_environment
  from public.fiscal_companies
  where id = new.company_id;

  if v_user_id is null or v_cnpj is null or v_uf_code is null or coalesce(new.access_key,'') = '' then
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
    v_user_id, new.company_id, v_cnpj, v_environment, v_uf_code, v_nsu,
    coalesce(new.source,'state_sales'), new.access_key,
    case when new.xml is not null and length(new.xml)>0 then 'procNFe_v4.00' else 'state_sales_reference' end,
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
$function$;