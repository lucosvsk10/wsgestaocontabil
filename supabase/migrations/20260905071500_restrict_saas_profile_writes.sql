-- Fiscal profile mutations are server-mediated. Browsers may only maintain the
-- branding path; production mode, numbering and tax data require Edge checks.
revoke insert, update on table public.saas_company_fiscal_profiles
  from anon, authenticated;

grant insert (organization_id, logo_path)
  on table public.saas_company_fiscal_profiles to authenticated;
grant update (logo_path, updated_at)
  on table public.saas_company_fiscal_profiles to authenticated;
