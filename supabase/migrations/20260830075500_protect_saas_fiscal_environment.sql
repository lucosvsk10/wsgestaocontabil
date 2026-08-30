create or replace function public.protect_saas_fiscal_environment()
returns trigger
language plpgsql
set search_path='public'
as $$
begin
  if (new.fiscal_environment is distinct from old.fiscal_environment
      or new.fiscal_environment_changed_at is distinct from old.fiscal_environment_changed_at
      or new.fiscal_environment_changed_by is distinct from old.fiscal_environment_changed_by)
     and coalesce(auth.jwt()->>'role','') <> 'service_role' then
    raise exception 'O ambiente fiscal só pode ser alterado pelo fluxo seguro do servidor.' using errcode='42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_saas_fiscal_environment on public.saas_company_fiscal_profiles;
create trigger trg_protect_saas_fiscal_environment
before update on public.saas_company_fiscal_profiles
for each row execute function public.protect_saas_fiscal_environment();
