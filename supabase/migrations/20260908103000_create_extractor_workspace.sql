-- Dedicated accounting-office workspace for the fiscal extractor.
-- Existing fiscal XML/certificates remain private and are only exposed through
-- the narrow, membership-checked snapshot below.

create table if not exists public.extractor_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 160),
  status text not null default 'active' check (status in ('trialing','active','past_due','suspended','cancelled')),
  plan_code text not null default 'office_20000',
  monthly_xml_limit integer not null default 20000 check (monthly_xml_limit between 100 and 10000000),
  base_lookback_days integer not null default 30 check (base_lookback_days between 1 and 366),
  history_from date,
  current_period_start date not null default date_trunc('month', current_date)::date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.extractor_companies (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.extractor_accounts(id) on delete cascade,
  fiscal_company_id uuid not null references public.fiscal_companies(id) on delete restrict,
  status text not null default 'active' check (status in ('active','paused','removed')),
  automatic_sync boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, fiscal_company_id)
);

create table if not exists public.extractor_history_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.extractor_accounts(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete restrict,
  requested_from date not null,
  requested_to date not null,
  estimated_xml integer check (estimated_xml is null or estimated_xml >= 0),
  quoted_amount numeric(12,2) check (quoted_amount is null or quoted_amount >= 0),
  status text not null default 'requested' check (status in ('requested','quoted','approved','processing','completed','cancelled')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requested_from <= requested_to)
);

create index if not exists extractor_companies_account_status_idx
  on public.extractor_companies(account_id, status, fiscal_company_id);
create index if not exists extractor_history_requests_account_created_idx
  on public.extractor_history_requests(account_id, created_at desc);

create or replace function private.is_extractor_member(
  _account_id uuid,
  _user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.extractor_accounts ea
    join public.organization_members om on om.organization_id = ea.organization_id
    where ea.id = _account_id
      and ea.status in ('trialing','active','past_due')
      and om.user_id = _user_id
      and om.status = 'active'
  );
$$;

create or replace function public.extractor_account_org_manager(
  _organization_id uuid,
  _user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = _organization_id
      and om.user_id = _user_id
      and om.status = 'active'
      and om.role in ('owner','admin')
  );
$$;

create or replace function private.can_manage_extractor(
  _account_id uuid,
  _user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.extractor_accounts ea
    where ea.id = _account_id
      and public.extractor_account_org_manager(ea.organization_id, _user_id)
  ) or private.is_any_admin(_user_id);
$$;

alter table public.extractor_accounts enable row level security;
alter table public.extractor_companies enable row level security;
alter table public.extractor_history_requests enable row level security;

drop policy if exists extractor_accounts_select_members on public.extractor_accounts;
create policy extractor_accounts_select_members on public.extractor_accounts
for select to authenticated
using (private.is_extractor_member(id, (select auth.uid())) or private.is_any_admin((select auth.uid())));

drop policy if exists extractor_accounts_admin_manage on public.extractor_accounts;
create policy extractor_accounts_admin_manage on public.extractor_accounts
for all to authenticated
using (private.is_any_admin((select auth.uid())))
with check (private.is_any_admin((select auth.uid())));

drop policy if exists extractor_companies_select_members on public.extractor_companies;
create policy extractor_companies_select_members on public.extractor_companies
for select to authenticated
using (private.is_extractor_member(account_id, (select auth.uid())) or private.is_any_admin((select auth.uid())));

drop policy if exists extractor_companies_manage on public.extractor_companies;
create policy extractor_companies_manage on public.extractor_companies
for all to authenticated
using (private.can_manage_extractor(account_id, (select auth.uid())))
with check (private.can_manage_extractor(account_id, (select auth.uid())));

drop policy if exists extractor_history_select_members on public.extractor_history_requests;
create policy extractor_history_select_members on public.extractor_history_requests
for select to authenticated
using (private.is_extractor_member(account_id, (select auth.uid())) or private.is_any_admin((select auth.uid())));

drop policy if exists extractor_history_insert_members on public.extractor_history_requests;
create policy extractor_history_insert_members on public.extractor_history_requests
for insert to authenticated
with check (
  requested_by = (select auth.uid())
  and private.is_extractor_member(account_id, (select auth.uid()))
);

drop policy if exists extractor_history_admin_manage on public.extractor_history_requests;
create policy extractor_history_admin_manage on public.extractor_history_requests
for update to authenticated
using (private.is_any_admin((select auth.uid())))
with check (private.is_any_admin((select auth.uid())));

create or replace function private.fill_extractor_history_request_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.requested_by := auth.uid();
  if new.account_id is null then
    select ea.id into new.account_id
    from public.extractor_accounts ea
    join public.organization_members om on om.organization_id = ea.organization_id
    where om.user_id = auth.uid()
      and om.status = 'active'
      and ea.status in ('trialing','active','past_due')
    order by ea.created_at
    limit 1;
  end if;
  if new.account_id is null or not private.is_extractor_member(new.account_id, auth.uid()) then
    raise exception 'extractor_access_denied' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_fill_extractor_history_request_identity on public.extractor_history_requests;
create trigger trg_fill_extractor_history_request_identity
before insert on public.extractor_history_requests
for each row execute function private.fill_extractor_history_request_identity();

create or replace function public.extractor_workspace_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_account public.extractor_accounts%rowtype;
  v_allowed_from date;
  v_companies jsonb := '[]'::jsonb;
  v_documents jsonb := '[]'::jsonb;
  v_totals jsonb := '{}'::jsonb;
begin
  select ea.* into v_account
  from public.extractor_accounts ea
  where ea.status in ('trialing','active','past_due')
    and (
      private.is_extractor_member(ea.id, auth.uid())
      or private.is_any_admin(auth.uid())
    )
  order by ea.created_at
  limit 1;

  if v_account.id is null then
    return null;
  end if;

  v_allowed_from := coalesce(v_account.history_from, current_date - v_account.base_lookback_days);

  select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.razao_social), '[]'::jsonb)
  into v_companies
  from (
    select
      fc.id,
      fc.razao_social,
      fc.nome_fantasia,
      fc.cnpj,
      fc.uf,
      fc.last_sync_at,
      count(fd.id)::integer as documents,
      cert.valid_until as certificate_until,
      case when cert.valid_until is null then null else (cert.valid_until - current_date)::integer end as certificate_days
    from public.extractor_companies ec
    join public.fiscal_companies fc on fc.id = ec.fiscal_company_id
    left join public.fiscal_dfe_documents fd
      on fd.company_id = fc.id
      and fd.document_kind <> 'evento'
      and fd.issue_date >= v_allowed_from
    left join lateral (
      select c.valid_until
      from public.fiscal_certificates c
      where c.company_id = fc.id and c.is_active = true
      order by c.valid_until desc
      limit 1
    ) cert on true
    where ec.account_id = v_account.id and ec.status = 'active'
    group by fc.id, cert.valid_until
  ) row_data;

  select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.issue_date desc), '[]'::jsonb)
  into v_documents
  from (
    select
      fd.id,
      fc.nome_fantasia as company_name,
      fd.note_number,
      fd.model,
      fd.direction,
      case when fd.direction in ('saida','outbound') then fd.recipient_cnpj else fd.issuer_name end as counterparty_name,
      fd.issue_date,
      fd.value,
      fd.status_text
    from public.extractor_companies ec
    join public.fiscal_companies fc on fc.id = ec.fiscal_company_id
    join public.fiscal_dfe_documents fd on fd.company_id = fc.id
    where ec.account_id = v_account.id
      and ec.status = 'active'
      and fd.document_kind <> 'evento'
      and fd.issue_date >= v_allowed_from
    order by fd.issue_date desc
    limit 50
  ) row_data;

  select jsonb_build_object(
    'documents', count(fd.id)::integer,
    'entries', count(fd.id) filter (where fd.direction not in ('saida','outbound'))::integer,
    'exits', count(fd.id) filter (where fd.direction in ('saida','outbound'))::integer,
    'value', coalesce(sum(fd.value), 0)
  ) into v_totals
  from public.extractor_companies ec
  join public.fiscal_dfe_documents fd on fd.company_id = ec.fiscal_company_id
  where ec.account_id = v_account.id
    and ec.status = 'active'
    and fd.document_kind <> 'evento'
    and fd.issue_date >= v_allowed_from;

  return jsonb_build_object(
    'account', jsonb_build_object(
      'id', v_account.id,
      'name', v_account.name,
      'plan_code', v_account.plan_code,
      'monthly_xml_limit', v_account.monthly_xml_limit,
      'base_lookback_days', v_account.base_lookback_days,
      'history_from', v_account.history_from
    ),
    'companies', v_companies,
    'documents', v_documents,
    'totals', v_totals
  );
end;
$$;

revoke all on public.extractor_accounts from anon;
revoke all on public.extractor_companies from anon;
revoke all on public.extractor_history_requests from anon;
grant select on public.extractor_accounts, public.extractor_companies to authenticated;
grant select, insert on public.extractor_history_requests to authenticated;

revoke execute on function public.extractor_workspace_snapshot() from public, anon;
grant execute on function public.extractor_workspace_snapshot() to authenticated;
revoke execute on function public.extractor_account_org_manager(uuid, uuid) from public, anon, authenticated;
revoke execute on function private.is_extractor_member(uuid, uuid) from public, anon;
revoke execute on function private.can_manage_extractor(uuid, uuid) from public, anon;
revoke execute on function private.fill_extractor_history_request_identity() from public, anon, authenticated;
grant execute on function private.is_extractor_member(uuid, uuid) to authenticated;
grant execute on function private.can_manage_extractor(uuid, uuid) to authenticated;

comment on table public.extractor_accounts is 'Workspace comercial do Extrator Fiscal, separado do painel administrativo.';
comment on column public.extractor_accounts.base_lookback_days is 'Janela padrão disponível ao assinante; aplicada pelo backend.';
comment on column public.extractor_accounts.history_from is 'Data histórica liberada após contratação; nula mantém apenas a janela padrão.';
comment on function public.extractor_workspace_snapshot() is 'Retorna apenas metadados fiscais permitidos ao escritório; nunca retorna XML, PFX, senha, fingerprint ou credenciais estaduais.';
