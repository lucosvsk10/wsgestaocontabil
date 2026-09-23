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
  v_tpnf text;
begin
  if new.company_id is null or new.document_kind='evento' then
    return new;
  end if;

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
  v_tpnf:=substring(coalesce(new.xml,'') from '<tpNF>([01])</tpNF>');

  -- NF-e de entrada may be issued by the company itself. When the official
  -- XML says tpNF=0, it is an entry even if emit/CNPJ is the company.
  if v_issuer=v_company_cnpj and v_tpnf='0' then
    new.direction:='entrada';
  elsif v_recipient=v_company_cnpj then
    new.direction:='entrada';
  elsif v_issuer=v_company_cnpj and v_tpnf='1' then
    new.direction:='saida';
  elsif v_issuer=v_company_cnpj then
    new.direction:='saida';
  end if;

  return new;
end;
$function$;

-- Re-run direction normalization for official NF-e XML already stored.
update public.fiscal_dfe_documents
set direction=direction,
    updated_at=now()
where document_kind='nfe'
  and xml is not null
  and access_key ~ '^[0-9]{44}$';

-- Reassert entry-report semantics after normalizing full XML rows.
update public.fiscal_dfe_documents
set direction='entrada',
    recipient_cnpj=regexp_replace(coalesce(cnpj,''),'\D','','g'),
    updated_at=now()
where (
    coalesce(schema_name,'')='sefaz-al-entry-report'
    or coalesce(source,'') in ('sefaz_al_entry_report','sefaz_al_entry_report_vercel')
  )
  and document_kind='nfe';