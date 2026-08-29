alter table public.fiscal_companies
  add column if not exists company_id uuid references public.companies(id) on delete set null;

alter table public.carousel_items
  add column if not exists company_id uuid references public.companies(id) on delete set null;

alter table public.documents
  add column if not exists company_id uuid references public.companies(id) on delete set null;

create index if not exists fiscal_companies_company_id_idx on public.fiscal_companies(company_id);
create index if not exists carousel_items_company_id_idx on public.carousel_items(company_id);
create index if not exists documents_company_id_idx on public.documents(company_id);

create table if not exists public.company_user_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, user_id)
);

create index if not exists company_user_links_company_id_idx on public.company_user_links(company_id);
create index if not exists company_user_links_user_id_idx on public.company_user_links(user_id);

alter table public.company_user_links enable row level security;

drop policy if exists "Admins manage company user links" on public.company_user_links;
create policy "Admins manage company user links"
  on public.company_user_links
  for all
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "Users can view own company link" on public.company_user_links;
create policy "Users can view own company link"
  on public.company_user_links
  for select
  using (user_id = (select auth.uid()));

update public.fiscal_companies f
set company_id = c.id
from public.companies c
where f.company_id is null
  and regexp_replace(coalesce(f.cnpj,''), '\D', '', 'g') = regexp_replace(coalesce(c.cnpj,''), '\D', '', 'g');

insert into public.company_user_links(company_id, user_id, is_primary)
select c.id, u.id, true
from public.companies c
join public.users u
  on lower(trim(coalesce(u.name,''))) in (
    lower(trim(coalesce(c.company_name,''))),
    lower(trim(coalesce(c.trade_name,'')))
  )
where coalesce(u.role,'client') = 'client'
on conflict (company_id, user_id) do nothing;

update public.documents d
set company_id = cul.company_id
from public.company_user_links cul
where d.company_id is null
  and cul.user_id = d.user_id
  and cul.is_primary = true;

update public.carousel_items ci
set company_id = c.id
from public.companies c
where ci.company_id is null
  and lower(trim(ci.name)) in (
    lower(trim(c.company_name)),
    lower(trim(coalesce(c.trade_name,'')))
  );

create or replace function private.sync_fiscal_company_to_registry()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  canonical_id uuid;
  normalized_cnpj text;
begin
  normalized_cnpj := regexp_replace(coalesce(new.cnpj,''), '\D', '', 'g');

  if normalized_cnpj = '' then
    return new;
  end if;

  select c.id
    into canonical_id
  from public.companies c
  where regexp_replace(coalesce(c.cnpj,''), '\D', '', 'g') = normalized_cnpj
  limit 1;

  if canonical_id is null then
    insert into public.companies (
      cnpj,
      company_name,
      trade_name,
      is_fiscal_automation_client
    ) values (
      normalized_cnpj,
      coalesce(nullif(trim(new.razao_social),''), normalized_cnpj),
      nullif(trim(coalesce(new.nome_fantasia,'')),''),
      true
    )
    returning id into canonical_id;
  else
    update public.companies
       set company_name = coalesce(nullif(trim(new.razao_social),''), company_name),
           trade_name = coalesce(nullif(trim(coalesce(new.nome_fantasia,'')),''), trade_name),
           is_fiscal_automation_client = true,
           updated_at = now()
     where id = canonical_id;
  end if;

  new.company_id := canonical_id;
  return new;
end;
$$;

revoke all on function private.sync_fiscal_company_to_registry() from public;
revoke all on function private.sync_fiscal_company_to_registry() from anon;
revoke all on function private.sync_fiscal_company_to_registry() from authenticated;

drop trigger if exists fiscal_companies_sync_registry on public.fiscal_companies;
create trigger fiscal_companies_sync_registry
before insert or update of cnpj, razao_social, nome_fantasia
on public.fiscal_companies
for each row
execute function private.sync_fiscal_company_to_registry();
