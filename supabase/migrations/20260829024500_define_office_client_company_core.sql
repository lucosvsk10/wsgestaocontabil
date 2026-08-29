comment on table public.companies is 'Cadastro central das empresas clientes do escritorio WS Gestao. Nao representa futuros assinantes do SaaS.';
comment on table public.company_user_links is 'Relaciona a empresa cliente do escritorio ao usuario que acessa o portal para receber documentos.';
comment on column public.fiscal_companies.company_id is 'Referencia ao cadastro central da empresa cliente do escritorio. O perfil fiscal e uma extensao da empresa, nao um novo cadastro.';
comment on column public.documents.company_id is 'Empresa cliente do escritorio destinataria do documento. user_id permanece para compatibilidade e controle de acesso do portal.';

create unique index if not exists fiscal_companies_one_profile_per_office_client
  on public.fiscal_companies(company_id)
  where company_id is not null;

create unique index if not exists company_user_links_one_primary_per_company
  on public.company_user_links(company_id)
  where is_primary = true;

create index if not exists documents_company_id_uploaded_at_idx
  on public.documents(company_id, uploaded_at desc)
  where company_id is not null;

create index if not exists fiscal_dfe_documents_company_issue_date_idx
  on public.fiscal_dfe_documents(company_id, issue_date desc)
  where company_id is not null;
