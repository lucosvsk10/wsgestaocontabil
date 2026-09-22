-- Consolidate historical duplicate fiscal documents by company/access key.
create temporary table _ws_dfe_dedupe_map on commit drop as
with ranked as (
  select
    id,
    company_id,
    access_key,
    row_number() over (
      partition by company_id,access_key
      order by
        (full_xml and xml is not null) desc,
        length(coalesce(xml,'')) desc,
        (document_kind='nfe') desc,
        updated_at desc,
        created_at desc,
        id
    ) as rn,
    first_value(id) over (
      partition by company_id,access_key
      order by
        (full_xml and xml is not null) desc,
        length(coalesce(xml,'')) desc,
        (document_kind='nfe') desc,
        updated_at desc,
        created_at desc,
        id
    ) as keep_id
  from public.fiscal_dfe_documents
  where company_id is not null
    and access_key is not null
    and document_kind <> 'evento'
)
select id as duplicate_id,keep_id
from ranked
where rn>1;

-- Avoid violating run/document uniqueness while preserving recovery references.
delete from public.fiscal_document_recovery_items ri
using _ws_dfe_dedupe_map m
where ri.document_id=m.duplicate_id
  and exists (
    select 1
    from public.fiscal_document_recovery_items keep_ri
    where keep_ri.run_id=ri.run_id
      and keep_ri.document_id=m.keep_id
  );

update public.fiscal_document_recovery_items ri
set document_id=m.keep_id
from _ws_dfe_dedupe_map m
where ri.document_id=m.duplicate_id;

delete from public.fiscal_dfe_documents d
using _ws_dfe_dedupe_map m
where d.id=m.duplicate_id;

-- Normalize direction permanently from the company's own CNPJ.
create or replace function public.normalize_fiscal_dfe_direction()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_company_cnpj text;
  v_issuer text;
  v_recipient text;
begin
  if new.company_id is null or new.document_kind='evento' then
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
$$;

drop trigger if exists trg_normalize_fiscal_dfe_direction on public.fiscal_dfe_documents;
create trigger trg_normalize_fiscal_dfe_direction
before insert or update of company_id,issuer_cnpj,recipient_cnpj,direction,document_kind
on public.fiscal_dfe_documents
for each row execute function public.normalize_fiscal_dfe_direction();
