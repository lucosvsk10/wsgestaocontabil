-- Secure subscriber console + cleanup of disposable checkout/integration QA identities.
create table if not exists public.admin_subscriber_console_settings (
  id integer primary key check (id = 1),
  password_salt text not null,
  password_hash text not null,
  password_iterations integer not null default 210000,
  configured_by uuid references auth.users(id) on delete set null,
  configured_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_subscriber_console_settings enable row level security;
comment on table public.admin_subscriber_console_settings is
  'Server-only password configuration for the SaaS subscriber administration console.';

do $cleanup$
declare
  v_user_ids uuid[];
  v_org_ids uuid[];
begin
  select coalesce(array_agg(id), '{}')
  into v_user_ids
  from auth.users
  where (
    email ilike 'checkout-qa-%@example.com'
    or email ilike 'codex-%@example.com'
    or email ilike 'codex.%@wsgestaocontabil.com'
    or email ilike 'test_user_%@testuser.com'
    or email ~* '^testuser[0-9]+@testuser\.com$'
    or lower(email) = 'test@testuser.com'
  );

  select coalesce(array_agg(id), '{}')
  into v_org_ids
  from public.organizations
  where owner_user_id = any(v_user_ids);

  if cardinality(v_org_ids) > 0 then
    update public.saas_audit_logs
       set organization_id = null
     where organization_id = any(v_org_ids);

    alter table public.organizations disable trigger trg_audit_organizations;
    alter table public.organization_members disable trigger trg_audit_organization_members;
    alter table public.saas_subscriptions disable trigger trg_audit_saas_subscriptions;
    alter table public.saas_invoices disable trigger trg_audit_saas_invoices;
    alter table public.saas_company_fiscal_profiles disable trigger trg_audit_saas_company_fiscal_profiles;
    alter table public.saas_fiscal_catalog_items disable trigger trg_audit_saas_fiscal_catalog_items;

    delete from public.organizations where id = any(v_org_ids);

    alter table public.saas_fiscal_catalog_items enable trigger trg_audit_saas_fiscal_catalog_items;
    alter table public.saas_company_fiscal_profiles enable trigger trg_audit_saas_company_fiscal_profiles;
    alter table public.saas_invoices enable trigger trg_audit_saas_invoices;
    alter table public.saas_subscriptions enable trigger trg_audit_saas_subscriptions;
    alter table public.organization_members enable trigger trg_audit_organization_members;
    alter table public.organizations enable trigger trg_audit_organizations;
  end if;

  if cardinality(v_user_ids) > 0 then
    delete from auth.users where id = any(v_user_ids);
  end if;
end
$cleanup$;
