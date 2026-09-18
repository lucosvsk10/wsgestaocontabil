-- Keep Enterprise quota dynamic across billing updates and initialize notification cursors for newly linked companies.

create or replace function public.normalize_extractor_account_plan_limit()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_plan public.saas_plans%rowtype;
  v_companies integer := 0;
  v_per_company integer := null;
  v_fixed integer := null;
begin
  select * into v_plan
  from public.saas_plans
  where code=new.plan_code
    and product_code='extractor'
    and status='active'
  limit 1;

  if v_plan.id is null then return new; end if;

  v_per_company := nullif(v_plan.limits->>'monthly_xml_per_company','')::integer;
  v_fixed := nullif(v_plan.limits->>'monthly_xml','')::integer;

  if v_per_company is not null and v_per_company>0 then
    if new.id is not null then
      select count(*)::integer into v_companies
      from public.extractor_companies
      where account_id=new.id and status='active';
    end if;
    new.monthly_xml_limit := greatest(v_companies,1) * v_per_company;
  elsif v_fixed is not null then
    new.monthly_xml_limit := v_fixed;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_normalize_extractor_account_plan_limit on public.extractor_accounts;
create trigger trg_normalize_extractor_account_plan_limit
before insert or update of plan_code, monthly_xml_limit
on public.extractor_accounts
for each row execute function public.normalize_extractor_account_plan_limit();

create or replace function public.ensure_extractor_notification_scan_state()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.status='active' then
    insert into public.extractor_notification_scan_state(account_id,company_id,last_scanned_at,updated_at)
    values(new.account_id,new.fiscal_company_id,now(),now())
    on conflict(account_id,company_id) do update
      set last_scanned_at=case
        when old.status is distinct from 'active' then now()
        else public.extractor_notification_scan_state.last_scanned_at
      end,
      updated_at=now();
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_ensure_extractor_notification_scan_state on public.extractor_companies;
create trigger trg_ensure_extractor_notification_scan_state
after insert or update of status
on public.extractor_companies
for each row execute function public.ensure_extractor_notification_scan_state();
