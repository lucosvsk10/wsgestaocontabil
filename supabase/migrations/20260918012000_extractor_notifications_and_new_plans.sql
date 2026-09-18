-- Extractor SaaS: plan tiers, real company limits, full XML document payloads and persistent import notifications.

-- 1) New commercial structure.
update public.saas_plans
set
  name = 'Extrator Padrão',
  price_cents = 9700,
  limits = jsonb_build_object('monthly_xml', 5000, 'companies', 5),
  features = jsonb_build_object(
    'sales', true,
    'purchases', true,
    'xml_download', true
  ),
  updated_at = now()
where code = 'extractor_commercial' and product_code = 'extractor';

insert into public.saas_plans(code,name,status,features,limits,product_code,price_cents,trial_days)
values(
  'extractor_pro',
  'Extrator Pro',
  'active',
  jsonb_build_object('sales',true,'purchases',true,'xml_download',true),
  jsonb_build_object('monthly_xml',15000,'companies',10),
  'extractor',
  15000,
  0
)
on conflict (code) do update
set
  name=excluded.name,
  status='active',
  features=excluded.features,
  limits=excluded.limits,
  product_code='extractor',
  price_cents=excluded.price_cents,
  updated_at=now();

update public.saas_plans
set
  name = 'Extrator Enterprise',
  price_cents = 39700,
  limits = jsonb_build_object(
    'monthly_xml', 10000,
    'monthly_xml_per_company', 10000,
    'companies', 100
  ),
  features = jsonb_build_object(
    'sales', true,
    'purchases', true,
    'xml_download', true,
    'enterprise', true,
    'hide_company_limit', true
  ),
  updated_at = now()
where code = 'extractor_enterprise' and product_code = 'extractor';

-- 2) Keep account quota synchronized with the real plan.
create or replace function public.extractor_refresh_account_limit(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_account public.extractor_accounts%rowtype;
  v_plan public.saas_plans%rowtype;
  v_companies integer := 0;
  v_limit integer := null;
  v_per_company integer := null;
begin
  select * into v_account
  from public.extractor_accounts
  where id = p_account_id
  for update;

  if v_account.id is null then return; end if;

  select * into v_plan
  from public.saas_plans
  where code = v_account.plan_code
    and product_code = 'extractor'
    and status = 'active'
  limit 1;

  if v_plan.id is null then return; end if;

  select count(*)::integer into v_companies
  from public.extractor_companies
  where account_id = p_account_id
    and status = 'active';

  v_per_company := nullif(v_plan.limits->>'monthly_xml_per_company','')::integer;

  if v_per_company is not null and v_per_company > 0 then
    v_limit := greatest(v_companies, 1) * v_per_company;
  else
    v_limit := nullif(v_plan.limits->>'monthly_xml','')::integer;
  end if;

  if v_limit is not null and v_limit >= 0 then
    update public.extractor_accounts
    set monthly_xml_limit = v_limit, updated_at = now()
    where id = p_account_id;
  end if;
end;
$function$;

revoke all on function public.extractor_refresh_account_limit(uuid) from public, anon, authenticated;
grant execute on function public.extractor_refresh_account_limit(uuid) to service_role;

create or replace function public.enforce_extractor_company_plan_limit()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_limit integer := null;
  v_active integer := 0;
begin
  if new.status <> 'active' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'active' and old.account_id = new.account_id then return new; end if;

  select nullif(p.limits->>'companies','')::integer
  into v_limit
  from public.extractor_accounts ea
  left join public.saas_plans p
    on p.code = ea.plan_code
   and p.product_code = 'extractor'
   and p.status = 'active'
  where ea.id = new.account_id;

  if v_limit is null or v_limit <= 0 then return new; end if;

  select count(*)::integer into v_active
  from public.extractor_companies ec
  where ec.account_id = new.account_id
    and ec.status = 'active'
    and (new.id is null or ec.id <> new.id);

  if v_active >= v_limit then
    raise exception 'extractor_company_limit_reached'
      using errcode='P0001',
            detail=format('plan_company_limit=%s', v_limit);
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_extractor_company_plan_limit on public.extractor_companies;
create trigger trg_extractor_company_plan_limit
before insert or update of status, account_id
on public.extractor_companies
for each row execute function public.enforce_extractor_company_plan_limit();

create or replace function public.refresh_extractor_account_limit_trigger()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if tg_op in ('UPDATE','DELETE') and old.account_id is not null then
    perform public.extractor_refresh_account_limit(old.account_id);
  end if;
  if tg_op in ('INSERT','UPDATE') and new.account_id is not null then
    perform public.extractor_refresh_account_limit(new.account_id);
  end if;
  return coalesce(new, old);
end;
$function$;

drop trigger if exists trg_refresh_extractor_account_limit on public.extractor_companies;
create trigger trg_refresh_extractor_account_limit
after insert or update of status, account_id or delete
on public.extractor_companies
for each row execute function public.refresh_extractor_account_limit_trigger();

do $$
declare r record;
begin
  for r in select id from public.extractor_accounts loop
    perform public.extractor_refresh_account_limit(r.id);
  end loop;
end $$;

-- 3) Return the already authorized XML to the Extrator. The RPC is already
-- membership/account/window scoped; this avoids a needless recovery request
-- and makes the SaaS preview match the ADM for documents already in storage.
create or replace function public.extractor_company_documents(
  _company_id uuid,
  _start date default (current_date - 30),
  _end date default current_date
)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  v_account public.extractor_accounts%rowtype;
  v_allowed_from date;
  v_from date;
  v_to date;
  v_documents jsonb := '[]'::jsonb;
  v_reconciliation jsonb := '[]'::jsonb;
  v_last_sync timestamptz;
begin
  if _company_id is null then
    raise exception 'extractor_company_required' using errcode = '22023';
  end if;
  if _start is null or _end is null or _start > _end then
    raise exception 'extractor_period_invalid' using errcode = '22023';
  end if;

  select ea.* into v_account
  from public.extractor_accounts ea
  join public.extractor_companies ec on ec.account_id = ea.id
  where ec.fiscal_company_id = _company_id
    and ec.status = 'active'
    and (
      private.is_extractor_member(ea.id, auth.uid())
      or private.is_any_admin(auth.uid())
    )
  order by ea.created_at
  limit 1;

  if v_account.id is null then
    raise exception 'extractor_company_access_denied' using errcode = '42501';
  end if;

  v_allowed_from := greatest(
    coalesce(v_account.history_from, current_date - v_account.base_lookback_days),
    current_date - 366
  );
  v_from := greatest(_start, v_allowed_from);
  v_to := least(_end, current_date);

  select fc.last_sync_at into v_last_sync
  from public.fiscal_companies fc
  where fc.id = _company_id;

  select coalesce(jsonb_agg(to_jsonb(d) order by d.issue_date desc nulls last, d.received_at desc), '[]'::jsonb)
  into v_documents
  from (
    select
      fd.id,
      fd.company_id,
      fd.nsu,
      fd.schema_name,
      fd.source,
      fd.document_kind,
      fd.full_xml,
      fd.xml,
      fd.direction,
      fd.access_key,
      fd.model,
      fd.issue_date,
      fd.value,
      fd.issuer_cnpj,
      fd.issuer_name,
      fd.recipient_cnpj,
      fd.note_number,
      fd.series,
      fd.status_code,
      fd.status_text,
      fd.parse_error,
      fd.received_at
    from public.fiscal_dfe_documents fd
    where fd.company_id = _company_id
      and (
        (fd.issue_date is not null and fd.issue_date >= v_from::timestamptz and fd.issue_date < (v_to + 1)::timestamptz)
        or (fd.issue_date is null and fd.received_at >= v_from::timestamptz and fd.received_at < (v_to + 1)::timestamptz)
      )
    order by fd.issue_date desc nulls last, fd.received_at desc
    limit 5000
  ) d;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.issue_date desc nulls last, r.note_number desc), '[]'::jsonb)
  into v_reconciliation
  from (
    select
      sr.company_id,
      sr.model,
      sr.series,
      sr.note_number,
      sr.status,
      sr.access_key,
      sr.issue_date,
      sr.month_code,
      sr.cstat,
      sr.xmotivo,
      sr.xml_status,
      sr.detail_status,
      sr.event_status,
      sr.updated_at
    from public.fiscal_sales_reconciliation sr
    where sr.company_id = _company_id
      and sr.issue_date is not null
      and sr.issue_date >= v_from::timestamptz
      and sr.issue_date < (v_to + 1)::timestamptz
    order by sr.issue_date desc nulls last, sr.note_number desc
    limit 5000
  ) r;

  return jsonb_build_object(
    'ok', true,
    'company_id', _company_id,
    'allowed_from', v_allowed_from,
    'requested_from', _start,
    'effective_from', v_from,
    'effective_to', v_to,
    'last_sync_at', v_last_sync,
    'documents', v_documents,
    'reconciliation', v_reconciliation
  );
end;
$function$;

-- 4) Persistent import notifications. Direct client access remains closed;
-- the authenticated Edge Function is the only user-facing entry point.
create table if not exists public.extractor_import_notifications (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.extractor_accounts(id) on delete cascade,
  company_id uuid not null references public.fiscal_companies(id) on delete cascade,
  kind text not null default 'fiscal_import',
  title text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists extractor_import_notifications_account_created_idx
  on public.extractor_import_notifications(account_id, created_at desc);
create index if not exists extractor_import_notifications_company_created_idx
  on public.extractor_import_notifications(company_id, created_at desc);

create table if not exists public.extractor_notification_user_state (
  notification_id uuid not null references public.extractor_import_notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz,
  dismissed_at timestamptz,
  primary key(notification_id, user_id)
);

create table if not exists public.extractor_notification_scan_state (
  account_id uuid not null references public.extractor_accounts(id) on delete cascade,
  company_id uuid not null references public.fiscal_companies(id) on delete cascade,
  last_scanned_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(account_id, company_id)
);

alter table public.extractor_import_notifications enable row level security;
alter table public.extractor_notification_user_state enable row level security;
alter table public.extractor_notification_scan_state enable row level security;

insert into public.extractor_notification_scan_state(account_id,company_id,last_scanned_at,updated_at)
select ec.account_id,ec.fiscal_company_id,now(),now()
from public.extractor_companies ec
where ec.status='active'
on conflict(account_id,company_id) do nothing;

create or replace function public.scan_extractor_import_notifications()
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  r record;
  v_last timestamptz;
  v_now timestamptz := now();
  v_purchases integer := 0;
  v_sales integer := 0;
  v_total integer := 0;
  v_keys text[] := '{}';
  v_issue_from timestamptz;
  v_issue_to timestamptz;
  v_created integer := 0;
  v_title text;
  v_message text;
begin
  for r in
    select
      ea.id account_id,
      ec.fiscal_company_id company_id,
      coalesce(nullif(ec.profile_overrides->>'trade_name',''),fc.nome_fantasia,fc.razao_social) company_name
    from public.extractor_accounts ea
    join public.extractor_companies ec on ec.account_id=ea.id
    join public.fiscal_companies fc on fc.id=ec.fiscal_company_id
    where ea.status in ('trialing','active','past_due')
      and ec.status='active'
      and coalesce(ec.automatic_sync,true)=true
  loop
    insert into public.extractor_notification_scan_state(account_id,company_id,last_scanned_at,updated_at)
    values(r.account_id,r.company_id,v_now,v_now)
    on conflict(account_id,company_id) do nothing;

    select last_scanned_at into v_last
    from public.extractor_notification_scan_state
    where account_id=r.account_id and company_id=r.company_id
    for update;

    with ranked as (
      select distinct on (coalesce(nullif(fd.access_key,''),fd.id::text))
        fd.id,fd.access_key,fd.direction,fd.issue_date,fd.created_at,fd.full_xml,fd.updated_at
      from public.fiscal_dfe_documents fd
      where fd.company_id=r.company_id
        and fd.document_kind<>'evento'
        and fd.created_at>v_last
        and fd.created_at<=v_now
        and fd.direction in ('entrada','inbound','saida','outbound')
      order by coalesce(nullif(fd.access_key,''),fd.id::text), fd.full_xml desc, fd.updated_at desc
    )
    select
      count(*) filter(where direction in ('entrada','inbound'))::integer,
      count(*) filter(where direction in ('saida','outbound'))::integer,
      count(*)::integer,
      coalesce(array_agg(access_key order by issue_date desc) filter(where access_key is not null),'{}'::text[]),
      min(issue_date),
      max(issue_date)
    into v_purchases,v_sales,v_total,v_keys,v_issue_from,v_issue_to
    from ranked;

    if coalesce(v_total,0)>0 then
      v_title := case
        when v_purchases>0 and v_sales>0 then 'Novos documentos importados'
        when v_purchases>0 then 'Novas compras importadas'
        else 'Novas vendas importadas'
      end;
      v_message := concat_ws(' · ',
        case when v_purchases>0 then format('%s compra(s)',v_purchases) end,
        case when v_sales>0 then format('%s venda(s)',v_sales) end
      );

      insert into public.extractor_import_notifications(account_id,company_id,kind,title,message,metadata)
      values(
        r.account_id,
        r.company_id,
        'fiscal_import',
        v_title,
        v_message,
        jsonb_build_object(
          'company_name',r.company_name,
          'purchase_count',v_purchases,
          'sales_count',v_sales,
          'total_count',v_total,
          'access_keys',to_jsonb(v_keys[1:100]),
          'issue_from',v_issue_from,
          'issue_to',v_issue_to,
          'scanned_from',v_last,
          'scanned_to',v_now
        )
      );
      v_created := v_created + 1;
    end if;

    update public.extractor_notification_scan_state
    set last_scanned_at=v_now,updated_at=v_now
    where account_id=r.account_id and company_id=r.company_id;
  end loop;

  return v_created;
end;
$function$;

revoke all on function public.scan_extractor_import_notifications() from public,anon,authenticated;
grant execute on function public.scan_extractor_import_notifications() to service_role;

-- Run shortly after the 10-minute purchase dispatcher and after the 3-hour sales dispatcher.
select cron.unschedule(jobid)
from cron.job
where jobname='extractor-import-notifications';

select cron.schedule(
  'extractor-import-notifications',
  '2,12,22,32,42,52 * * * *',
  'select public.scan_extractor_import_notifications();'
);
