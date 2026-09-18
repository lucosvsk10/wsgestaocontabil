-- Internal WS product workspaces are not commercial subscriptions.
-- They give the platform administrator a clean, portable home for internal tools
-- while keeping Mercado Pago trials/test accounts isolated.

create table if not exists public.admin_product_workspaces (
  id uuid primary key default gen_random_uuid(),
  product_code text not null unique,
  label text not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  extractor_account_id uuid references public.extractor_accounts(id) on delete set null,
  status text not null default 'active' check (status in ('active','disabled')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_product_workspaces enable row level security;

drop policy if exists admin_product_workspaces_admin_select on public.admin_product_workspaces;
create policy admin_product_workspaces_admin_select
on public.admin_product_workspaces
for select
to authenticated
using (private.is_any_admin(auth.uid()));

drop policy if exists admin_product_workspaces_admin_manage on public.admin_product_workspaces;
create policy admin_product_workspaces_admin_manage
on public.admin_product_workspaces
for all
to authenticated
using (private.is_any_admin(auth.uid()))
with check (private.is_any_admin(auth.uid()));

comment on table public.admin_product_workspaces is
  'Workspaces internos da WS. Independem de assinatura comercial, trial e Mercado Pago.';

do $$
declare
  v_admin uuid;
  v_internal_org uuid;
  v_extractor_account uuid;
begin
  select id
    into v_admin
  from auth.users
  where lower(email) = 'wsgestao@gmail.com'
  limit 1;

  if v_admin is null then
    raise exception 'Administrador WS não encontrado';
  end if;

  insert into public.organizations (name, slug, status, owner_user_id)
  values ('WS Gestão Contábil — Operação Interna', 'ws-gestao-operacao-interna', 'active', v_admin)
  on conflict (slug) do update
    set name = excluded.name,
        status = 'active',
        owner_user_id = excluded.owner_user_id,
        updated_at = now();

  select id
    into v_internal_org
  from public.organizations
  where slug = 'ws-gestao-operacao-interna'
  limit 1;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (v_internal_org, v_admin, 'owner', 'active')
  on conflict (organization_id, user_id) do update
    set role = 'owner',
        status = 'active';

  insert into public.extractor_accounts (
    organization_id,
    name,
    status,
    plan_code,
    monthly_xml_limit,
    base_lookback_days,
    history_from,
    access_source,
    access_expires_at,
    lifetime_access
  )
  values (
    v_internal_org,
    'WS Gestão Contábil — Extrator Interno',
    'active',
    'internal_ws',
    10000000,
    366,
    current_date - 366,
    'manual',
    null,
    true
  )
  on conflict (organization_id) do update
    set name = excluded.name,
        status = 'active',
        plan_code = 'internal_ws',
        monthly_xml_limit = 10000000,
        base_lookback_days = 366,
        history_from = least(public.extractor_accounts.history_from, excluded.history_from),
        access_source = 'manual',
        access_expires_at = null,
        lifetime_access = true,
        updated_at = now();

  select id
    into v_extractor_account
  from public.extractor_accounts
  where organization_id = v_internal_org
  limit 1;

  insert into public.admin_product_workspaces (
    product_code,
    label,
    organization_id,
    extractor_account_id,
    status,
    metadata
  )
  values (
    'issuer',
    'Emissor Fiscal',
    v_internal_org,
    null,
    'active',
    jsonb_build_object('access_mode','internal','billing_exempt',true)
  )
  on conflict (product_code) do update
    set label = excluded.label,
        organization_id = excluded.organization_id,
        extractor_account_id = null,
        status = 'active',
        metadata = excluded.metadata,
        updated_at = now();

  insert into public.admin_product_workspaces (
    product_code,
    label,
    organization_id,
    extractor_account_id,
    status,
    metadata
  )
  values (
    'extractor',
    'Extrator Fiscal',
    v_internal_org,
    v_extractor_account,
    'active',
    jsonb_build_object('access_mode','internal','billing_exempt',true)
  )
  on conflict (product_code) do update
    set label = excluded.label,
        organization_id = excluded.organization_id,
        extractor_account_id = excluded.extractor_account_id,
        status = 'active',
        metadata = excluded.metadata,
        updated_at = now();

  -- Keep legacy/test memberships untouched for now. Internal routing is resolved
  -- explicitly through admin_product_workspaces, so old test histories remain intact.
end $$;
