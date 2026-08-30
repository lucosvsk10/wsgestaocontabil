alter table public.saas_fiscal_emissions
  add column if not exists external_source_id text;

alter table public.saas_fiscal_emissions
  add column if not exists imported_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'saas_fiscal_emissions_org_external_source_key'
      and conrelid = 'public.saas_fiscal_emissions'::regclass
  ) then
    alter table public.saas_fiscal_emissions
      add constraint saas_fiscal_emissions_org_external_source_key
      unique (organization_id, external_source_id);
  end if;
end $$;

create index if not exists saas_fiscal_emissions_org_source_created_idx
  on public.saas_fiscal_emissions (organization_id, source, created_at desc);
