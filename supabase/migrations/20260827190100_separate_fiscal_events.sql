create table if not exists public.fiscal_dfe_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  company_id uuid references public.fiscal_companies(id) on delete cascade,
  cnpj text not null,
  environment text not null,
  uf_code text not null,
  nsu text not null,
  schema_name text,
  access_key text,
  event_type text,
  event_description text,
  status_code text,
  event_at timestamptz,
  xml text,
  source text not null default 'national_dfe',
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, cnpj, environment, uf_code, nsu)
);

alter table public.fiscal_dfe_events enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='fiscal_dfe_events'
      and policyname='admins_manage_fiscal_dfe_events'
  ) then
    create policy admins_manage_fiscal_dfe_events on public.fiscal_dfe_events
      for all to authenticated
      using (private.is_admin())
      with check (private.is_admin());
  end if;
end $$;

create index if not exists fiscal_dfe_events_company_date_idx
  on public.fiscal_dfe_events(company_id, event_at desc);
create index if not exists fiscal_dfe_events_access_key_idx
  on public.fiscal_dfe_events(company_id, access_key);

insert into public.fiscal_dfe_events(
  user_id,company_id,cnpj,environment,uf_code,nsu,schema_name,access_key,
  event_type,event_description,status_code,event_at,xml,source,
  received_at,created_at,updated_at
)
select user_id,company_id,cnpj,environment,uf_code,nsu,schema_name,access_key,
       substring(xml from '<tpEvento>([^<]+)</tpEvento>'),
       coalesce(
         substring(xml from '<descEvento>([^<]+)</descEvento>'),
         substring(xml from '<xEvento>([^<]+)</xEvento>')
       ),
       status_code, issue_date, xml, coalesce(source,'national_dfe'),
       received_at,created_at,updated_at
from public.fiscal_dfe_documents
where document_kind='evento'
on conflict (user_id,cnpj,environment,uf_code,nsu) do nothing;

delete from public.fiscal_dfe_documents where document_kind='evento';
