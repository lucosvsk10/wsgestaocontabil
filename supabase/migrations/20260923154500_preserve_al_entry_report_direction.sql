create or replace function public.normalize_fiscal_dfe_direction()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_company_cnpj text;
  v_issuer text;
  v_recipient text;
begin
  if new.company_id is null or new.document_kind='evento' then
    return new;
  end if;

  -- The SEFAZ/AL endpoint /relatorios/notas-fiscais-entrada is, by definition,
  -- an entry source for the queried company. A company may legitimately issue
  -- an NF-e de entrada itself, so issuer=company must not flip it to "saida".
  if coalesce(new.schema_name,'')='sefaz-al-entry-report'
     or coalesce(new.source,'') in ('sefaz_al_entry_report','sefaz_al_entry_report_vercel') then
    new.direction := 'entrada';
    return new;
  end if;

  select regexp_replace(coalesce(cnpj,''),'\D','','g')
    into v_company_cnpj
  from public.fiscal_companies
  where id=new.company_id;

  if coalesce(v_company_cnpj,'')='' then
    return new;
  end if;

  v_issuer:=regexp_replace(coalesce(new.issuer_cnpj,''),'\D','','g');
  v_recipient:=regexp_replace(coalesce(new.recipient_cnpj,''),'\D','','g');

  if v_issuer=v_company_cnpj then
    new.direction:='saida';
  elsif v_recipient=v_company_cnpj then
    new.direction:='entrada';
  end if;

  return new;
end;
$function$;

update public.fiscal_dfe_documents
set
  direction='entrada',
  recipient_cnpj=regexp_replace(coalesce(cnpj,''),'\D','','g'),
  updated_at=now()
where (
    coalesce(schema_name,'')='sefaz-al-entry-report'
    or coalesce(source,'') in ('sefaz_al_entry_report','sefaz_al_entry_report_vercel')
  )
  and document_kind='nfe'
  and (
    direction is distinct from 'entrada'
    or recipient_cnpj is distinct from regexp_replace(coalesce(cnpj,''),'\D','','g')
  );