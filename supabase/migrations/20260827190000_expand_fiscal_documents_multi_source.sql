alter table public.fiscal_dfe_documents
  add column if not exists company_id uuid references public.fiscal_companies(id) on delete cascade,
  add column if not exists source text,
  add column if not exists source_id text,
  add column if not exists model text,
  add column if not exists status_text text,
  add column if not exists authorized_at timestamptz;

update public.fiscal_dfe_documents d
set company_id = c.id
from public.fiscal_companies c
where d.company_id is null
  and regexp_replace(d.cnpj, '\D', '', 'g') = regexp_replace(c.cnpj, '\D', '', 'g');

update public.fiscal_dfe_documents
set source = case when nsu like 'WS-%' then 'ws_emitter' else 'national_dfe' end
where source is null;

update public.fiscal_dfe_documents
set source_id = coalesce(nullif(nsu,''), access_key, id::text)
where source_id is null;

update public.fiscal_dfe_documents
set model = substring(regexp_replace(access_key,'\D','','g') from 21 for 2)
where model is null
  and length(regexp_replace(coalesce(access_key,''),'\D','','g')) = 44;

alter table public.fiscal_dfe_documents alter column source set default 'national_dfe';

create index if not exists fiscal_dfe_documents_company_issue_idx
  on public.fiscal_dfe_documents(company_id, issue_date desc);
create index if not exists fiscal_dfe_documents_company_direction_idx
  on public.fiscal_dfe_documents(company_id, direction, issue_date desc);
create index if not exists fiscal_dfe_documents_source_idx
  on public.fiscal_dfe_documents(company_id, source, source_id);
create index if not exists fiscal_dfe_documents_access_key_idx
  on public.fiscal_dfe_documents(company_id, access_key)
  where access_key is not null;
create unique index if not exists fiscal_dfe_documents_source_identity_uidx
  on public.fiscal_dfe_documents(user_id, company_id, environment, source, source_id)
  where company_id is not null and source is not null and source_id is not null;

comment on column public.fiscal_dfe_documents.source is
  'Origem técnica: national_dfe, sefaz_<uf>, ws_emitter, adn_nfse, etc.';
comment on column public.fiscal_dfe_documents.source_id is
  'Identificador estável dentro da fonte: NSU no DistDFe e chave no conector estadual.';
