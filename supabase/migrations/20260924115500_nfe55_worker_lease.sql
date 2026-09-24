alter table public.fiscal_sales_sync_state
  add column if not exists nfe55_lease_until timestamptz;

create or replace function public.claim_fiscal_sales_worker_lease(
  p_company_id uuid,
  p_worker text,
  p_seconds integer default 110
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare claimed boolean := false;
begin
  if p_worker = 'xml' then
    update public.fiscal_sales_sync_state
      set xml_lease_until = now() + make_interval(secs => greatest(30, least(coalesce(p_seconds,110),600))), updated_at = now()
      where company_id = p_company_id and (xml_lease_until is null or xml_lease_until < now())
      returning true into claimed;
  elsif p_worker = 'detail' then
    update public.fiscal_sales_sync_state
      set detail_lease_until = now() + make_interval(secs => greatest(30, least(coalesce(p_seconds,110),600))), updated_at = now()
      where company_id = p_company_id and (detail_lease_until is null or detail_lease_until < now())
      returning true into claimed;
  elsif p_worker = 'nfe55' then
    update public.fiscal_sales_sync_state
      set nfe55_lease_until = now() + make_interval(secs => greatest(30, least(coalesce(p_seconds,110),600))), updated_at = now()
      where company_id = p_company_id and (nfe55_lease_until is null or nfe55_lease_until < now())
      returning true into claimed;
  else
    raise exception 'unknown worker';
  end if;
  return coalesce(claimed,false);
end;
$$;

create or replace function public.release_fiscal_sales_worker_lease(
  p_company_id uuid,
  p_worker text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_worker = 'xml' then
    update public.fiscal_sales_sync_state set xml_lease_until = null, updated_at = now() where company_id = p_company_id;
  elsif p_worker = 'detail' then
    update public.fiscal_sales_sync_state set detail_lease_until = null, updated_at = now() where company_id = p_company_id;
  elsif p_worker = 'nfe55' then
    update public.fiscal_sales_sync_state set nfe55_lease_until = null, updated_at = now() where company_id = p_company_id;
  end if;
end;
$$;

revoke all on function public.claim_fiscal_sales_worker_lease(uuid,text,integer) from public, anon, authenticated;
revoke all on function public.release_fiscal_sales_worker_lease(uuid,text) from public, anon, authenticated;
grant execute on function public.claim_fiscal_sales_worker_lease(uuid,text,integer) to service_role;
grant execute on function public.release_fiscal_sales_worker_lease(uuid,text) to service_role;
