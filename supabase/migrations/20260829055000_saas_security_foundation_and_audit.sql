create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status text not null default 'active' check (status in ('active','suspended','closed')),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member','viewer')),
  status text not null default 'active' check (status in ('active','invited','disabled')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.organization_companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, company_id)
);

create table if not exists public.saas_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  status text not null default 'active' check (status in ('active','archived')),
  features jsonb not null default '{}'::jsonb,
  limits jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saas_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.saas_plans(id) on delete restrict,
  status text not null default 'trialing' check (status in ('trialing','active','past_due','canceled','paused','incomplete')),
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists saas_subscriptions_one_live_per_org
  on public.saas_subscriptions(organization_id)
  where status in ('trialing','active','past_due','paused','incomplete');

create table if not exists public.saas_audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  is_sensitive boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists saas_audit_logs_org_created_idx on public.saas_audit_logs(organization_id, created_at desc);
create index if not exists organization_members_user_idx on public.organization_members(user_id, organization_id);
create index if not exists organization_companies_company_idx on public.organization_companies(company_id, organization_id);

create or replace function private.is_org_member(_org_id uuid, _user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members om
    where om.organization_id = _org_id and om.user_id = _user_id and om.status = 'active'
  );
$$;

create or replace function private.has_org_role(_org_id uuid, _roles text[], _user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members om
    where om.organization_id = _org_id and om.user_id = _user_id and om.status = 'active' and om.role = any(_roles)
  );
$$;

create or replace function private.can_manage_org(_org_id uuid, _user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_org_role(_org_id, array['owner','admin']::text[], _user_id) or private.is_any_admin(_user_id);
$$;

create or replace function private.storage_org_id(_name text)
returns uuid language plpgsql stable set search_path = '' as $$
declare v uuid;
begin
  begin v := nullif(split_part(_name, '/', 1), '')::uuid;
  exception when others then return null;
  end;
  return v;
end;
$$;

create or replace function private.add_organization_owner_membership()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.organization_members(organization_id,user_id,role,status)
  values (new.id,new.owner_user_id,'owner','active')
  on conflict (organization_id,user_id) do update set role='owner',status='active',updated_at=now();
  return new;
end;
$$;

drop trigger if exists trg_add_organization_owner_membership on public.organizations;
create trigger trg_add_organization_owner_membership after insert on public.organizations
for each row execute function private.add_organization_owner_membership();

create or replace function private.audit_saas_sensitive_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare row_data jsonb; org_id uuid; rid text;
begin
  row_data := case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  org_id := case when tg_table_name='organizations' then (row_data->>'id')::uuid else nullif(row_data->>'organization_id','')::uuid end;
  rid := row_data->>'id';
  insert into public.saas_audit_logs(organization_id, actor_user_id, action, resource_type, resource_id, is_sensitive, metadata)
  values (org_id, auth.uid(), lower(tg_op), tg_table_name, rid, true, jsonb_build_object('source','database_trigger'));
  return case when tg_op='DELETE' then old else new end;
end;
$$;

drop trigger if exists trg_audit_organizations on public.organizations;
create trigger trg_audit_organizations after insert or update or delete on public.organizations for each row execute function private.audit_saas_sensitive_change();
drop trigger if exists trg_audit_organization_members on public.organization_members;
create trigger trg_audit_organization_members after insert or update or delete on public.organization_members for each row execute function private.audit_saas_sensitive_change();
drop trigger if exists trg_audit_organization_companies on public.organization_companies;
create trigger trg_audit_organization_companies after insert or update or delete on public.organization_companies for each row execute function private.audit_saas_sensitive_change();
drop trigger if exists trg_audit_saas_subscriptions on public.saas_subscriptions;
create trigger trg_audit_saas_subscriptions after insert or update or delete on public.saas_subscriptions for each row execute function private.audit_saas_sensitive_change();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_companies enable row level security;
alter table public.saas_plans enable row level security;
alter table public.saas_subscriptions enable row level security;
alter table public.saas_audit_logs enable row level security;

create policy "organizations_select_members" on public.organizations for select to authenticated
using (private.is_org_member(id, auth.uid()) or private.is_any_admin(auth.uid()));
create policy "organizations_insert_owner" on public.organizations for insert to authenticated
with check (owner_user_id = auth.uid() or private.is_any_admin(auth.uid()));
create policy "organizations_update_managers" on public.organizations for update to authenticated
using (private.can_manage_org(id, auth.uid())) with check (private.can_manage_org(id, auth.uid()));
create policy "organizations_delete_owner" on public.organizations for delete to authenticated
using (private.has_org_role(id,array['owner']::text[],auth.uid()) or private.is_any_admin(auth.uid()));

create policy "organization_members_select" on public.organization_members for select to authenticated
using (user_id=auth.uid() or private.can_manage_org(organization_id,auth.uid()));
create policy "organization_members_insert_managers" on public.organization_members for insert to authenticated
with check (private.can_manage_org(organization_id,auth.uid()));
create policy "organization_members_update_managers" on public.organization_members for update to authenticated
using (private.can_manage_org(organization_id,auth.uid())) with check (private.can_manage_org(organization_id,auth.uid()));
create policy "organization_members_delete_managers" on public.organization_members for delete to authenticated
using (private.can_manage_org(organization_id,auth.uid()));

create policy "organization_companies_select_members" on public.organization_companies for select to authenticated
using (private.is_org_member(organization_id,auth.uid()) or private.is_any_admin(auth.uid()));
create policy "organization_companies_manage" on public.organization_companies for all to authenticated
using (private.can_manage_org(organization_id,auth.uid())) with check (private.can_manage_org(organization_id,auth.uid()));

create policy "saas_plans_read_active" on public.saas_plans for select to authenticated using (status='active' or private.is_any_admin(auth.uid()));
create policy "saas_plans_admin_manage" on public.saas_plans for all to authenticated using (private.is_any_admin(auth.uid())) with check (private.is_any_admin(auth.uid()));

create policy "saas_subscriptions_read_members" on public.saas_subscriptions for select to authenticated
using (private.is_org_member(organization_id,auth.uid()) or private.is_any_admin(auth.uid()));
create policy "saas_subscriptions_admin_manage" on public.saas_subscriptions for all to authenticated
using (private.is_any_admin(auth.uid())) with check (private.is_any_admin(auth.uid()));

create policy "saas_audit_logs_read_managers" on public.saas_audit_logs for select to authenticated
using ((organization_id is not null and private.can_manage_org(organization_id,auth.uid())) or private.is_any_admin(auth.uid()));

revoke insert, update, delete on public.saas_audit_logs from anon, authenticated;

insert into storage.buckets(id,name,public,file_size_limit)
values ('saas-private','saas-private',false,52428800)
on conflict (id) do nothing;

create policy "saas_storage_read_members" on storage.objects for select to authenticated
using (bucket_id='saas-private' and private.is_org_member(private.storage_org_id(name),auth.uid()));
create policy "saas_storage_insert_members" on storage.objects for insert to authenticated
with check (bucket_id='saas-private' and private.is_org_member(private.storage_org_id(name),auth.uid()));
create policy "saas_storage_update_members" on storage.objects for update to authenticated
using (bucket_id='saas-private' and private.is_org_member(private.storage_org_id(name),auth.uid()))
with check (bucket_id='saas-private' and private.is_org_member(private.storage_org_id(name),auth.uid()));
create policy "saas_storage_delete_managers" on storage.objects for delete to authenticated
using (bucket_id='saas-private' and private.can_manage_org(private.storage_org_id(name),auth.uid()));

drop policy if exists "accounting mapping rules readable by authenticated" on public.accounting_mapping_rules;
create policy "accounting mapping rules admins only" on public.accounting_mapping_rules for select to authenticated using (private.is_any_admin(auth.uid()));
drop policy if exists "Allow delete for authenticated users" on public.document_categories;
create policy "Admins can delete document categories" on public.document_categories for delete to authenticated using (private.is_any_admin(auth.uid()));
drop policy if exists "Authenticated users can insert notifications" on public.notifications;
drop policy if exists "Anyone can view fiscal events" on public.fiscal_events;
create policy "Admins can view fiscal events" on public.fiscal_events for select to authenticated using (private.is_any_admin(auth.uid()));

create policy "deny direct access debug token" on public._fiscal_sales_debug_token for all to authenticated using (false) with check (false);
create policy "deny direct access temporary debug token" on public._temporary_sefaz_debug_token for all to authenticated using (false) with check (false);
create policy "accounting ai usage admins read" on public.accounting_ai_usage for select to authenticated using (private.is_any_admin(auth.uid()));
create policy "accounting engine settings admins read" on public.accounting_engine_settings for select to authenticated using (private.is_any_admin(auth.uid()));
create policy "fiscal nfse state admins read" on public.fiscal_nfse_sync_state for select to authenticated using (private.is_any_admin(auth.uid()));
create policy "fiscal connector runs admins read" on public.fiscal_sales_connector_runs for select to authenticated using (private.is_any_admin(auth.uid()));
create policy "fiscal connector state admins read" on public.fiscal_sales_connector_state for select to authenticated using (private.is_any_admin(auth.uid()));
create policy "fiscal sales documents admins read" on public.fiscal_sales_documents for select to authenticated using (private.is_any_admin(auth.uid()));
create policy "fiscal probe results admins read" on public.fiscal_sales_probe_results for select to authenticated using (private.is_any_admin(auth.uid()));
create policy "deny direct access fiscal credentials" on public.fiscal_state_credentials for all to authenticated using (false) with check (false);

do $$
declare r record;
begin
  for r in select schemaname,tablename from pg_tables where schemaname='public' loop
    execute format('revoke truncate, trigger, references on table %I.%I from anon, authenticated',r.schemaname,r.tablename);
  end loop;
end $$;

revoke select on public.companies from anon, authenticated;
grant select (id,cnpj,company_name,created_at,updated_at,is_fiscal_automation_client,trade_name,address,company_size,logo_url) on public.companies to authenticated;

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as fn
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef
      and (left(p.proname,5)='_run_' or p.proname in ('get_ws_test_a1_credentials','dispatch_fiscal_sales_debug','trigger_fiscal_purchase_report_backfill','trigger_fiscal_purchase_supplemental','trigger_fiscal_purchases_xml_backfill','trigger_fiscal_sales_cron'))
  loop
    execute format('revoke execute on function %s from public, anon, authenticated',r.fn);
    execute format('grant execute on function %s to service_role',r.fn);
  end loop;
end $$;

revoke execute on function private.add_organization_owner_membership() from public, anon, authenticated;
revoke execute on function private.audit_saas_sensitive_change() from public, anon, authenticated;
grant execute on function private.is_org_member(uuid,uuid) to authenticated;
grant execute on function private.has_org_role(uuid,text[],uuid) to authenticated;
grant execute on function private.can_manage_org(uuid,uuid) to authenticated;
grant execute on function private.storage_org_id(text) to authenticated;
