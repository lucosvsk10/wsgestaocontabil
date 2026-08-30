alter table public.saas_fiscal_emissions add column if not exists source text not null default 'system';
alter table public.saas_fiscal_emissions add column if not exists external_issue_date timestamptz;
alter table public.saas_fiscal_emissions add column if not exists external_source text;
alter table public.saas_fiscal_emissions drop constraint if exists saas_fiscal_emissions_source_check;
alter table public.saas_fiscal_emissions add constraint saas_fiscal_emissions_source_check check (source in ('system','imported'));
create index if not exists saas_fiscal_emissions_org_source_idx on public.saas_fiscal_emissions(organization_id,source,created_at desc);
