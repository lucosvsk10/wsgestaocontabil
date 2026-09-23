
create or replace function public.enforce_sp_nfe55_reconciliation_semantics()
returns trigger
language plpgsql
security invoker
set search_path to 'public'
as $$
declare
  company_uf text;
begin
  if new.model = '55' and new.status in ('not_authorized','inutilized') then
    select upper(coalesce(uf,'')) into company_uf
    from public.fiscal_companies
    where id = new.company_id;

    if company_uf = 'SP' then
      if new.status = 'not_authorized' and coalesce(new.cstat,'') <> '220' then
        raise exception 'SP NF-e55 not_authorized requires definitive cStat 220; received %', coalesce(new.cstat,'NULL');
      end if;
      if new.status = 'inutilized' and coalesce(new.cstat,'') <> '206' then
        raise exception 'SP NF-e55 inutilized requires definitive cStat 206; received %', coalesce(new.cstat,'NULL');
      end if;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_sp_nfe55_reconciliation_semantics() from public, anon, authenticated;
grant execute on function public.enforce_sp_nfe55_reconciliation_semantics() to service_role;

drop trigger if exists trg_enforce_sp_nfe55_reconciliation_semantics
on public.fiscal_sales_reconciliation;

create trigger trg_enforce_sp_nfe55_reconciliation_semantics
before insert or update of company_id,model,status,cstat
on public.fiscal_sales_reconciliation
for each row execute function public.enforce_sp_nfe55_reconciliation_semantics();
