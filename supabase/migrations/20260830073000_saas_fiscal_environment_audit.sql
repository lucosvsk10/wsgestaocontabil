alter table public.saas_company_fiscal_profiles
  add column if not exists fiscal_environment_changed_at timestamptz,
  add column if not exists fiscal_environment_changed_by uuid;
