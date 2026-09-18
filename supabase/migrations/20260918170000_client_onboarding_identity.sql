alter table public.companies
  add column if not exists document_type text,
  add column if not exists document_number text;

update public.companies
set document_type = case when nullif(regexp_replace(coalesce(cnpj,''),'\D','','g'),'') is not null then 'cnpj' else document_type end,
    document_number = coalesce(nullif(document_number,''), nullif(regexp_replace(coalesce(cnpj,''),'\D','','g'),''))
where document_type is null or document_number is null;

alter table public.companies
  drop constraint if exists companies_document_type_check;

alter table public.companies
  add constraint companies_document_type_check
  check (document_type is null or document_type in ('cnpj','cpf','other'));

create unique index if not exists companies_document_number_unique
  on public.companies(document_number)
  where document_number is not null and document_number <> '';

drop policy if exists "Linked clients can view their company" on public.companies;
create policy "Linked clients can view their company"
on public.companies
for select
to authenticated
using (
  exists (
    select 1
    from public.company_user_links cul
    where cul.company_id = companies.id
      and cul.user_id = auth.uid()
  )
);
