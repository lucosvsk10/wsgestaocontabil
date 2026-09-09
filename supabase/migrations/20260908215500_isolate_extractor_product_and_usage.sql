alter table public.organizations
  add column if not exists product_scope text not null default 'general';

alter table public.organizations drop constraint if exists organizations_product_scope_check;
alter table public.organizations add constraint organizations_product_scope_check
  check (product_scope in ('general','saas','extractor','shared'));

comment on column public.organizations.product_scope is
  'Product boundary for memberships. Extractor-only organizations must never appear inside the fiscal issuer.';

do $$
declare
  v_user uuid;
  v_org uuid;
  v_account uuid;
begin
  select id into v_user from auth.users where lower(email)='wsteste@gmail.com' limit 1;
  if v_user is null then return; end if;

  select id into v_org from public.organizations where slug='ws-teste-extrator' limit 1;
  if v_org is null then
    insert into public.organizations(name,slug,status,owner_user_id,product_scope)
    values ('WS teste','ws-teste-extrator','active',v_user,'extractor')
    returning id into v_org;
  else
    update public.organizations
    set name='WS teste',status='active',owner_user_id=v_user,product_scope='extractor',updated_at=now()
    where id=v_org;
  end if;

  insert into public.organization_members(organization_id,user_id,role,status)
  values(v_org,v_user,'owner','active')
  on conflict(organization_id,user_id) do update
    set role='owner',status='active',updated_at=now();

  select ea.id into v_account
  from public.extractor_accounts ea
  join public.organization_members om on om.organization_id=ea.organization_id
  where om.user_id=v_user and ea.plan_code='lifetime_test'
  order by ea.created_at limit 1;

  if v_account is not null then
    update public.extractor_accounts
    set organization_id=v_org,name='WS teste',updated_at=now()
    where id=v_account;
  end if;
end $$;

update public.organizations o
set product_scope='extractor',updated_at=now()
where exists(select 1 from public.extractor_accounts ea where ea.organization_id=o.id)
  and not exists(select 1 from public.saas_company_fiscal_profiles sp where sp.organization_id=o.id)
  and not exists(select 1 from public.saas_subscriptions ss where ss.organization_id=o.id);

update public.organizations o
set product_scope='saas',updated_at=now()
where (exists(select 1 from public.saas_company_fiscal_profiles sp where sp.organization_id=o.id)
    or exists(select 1 from public.saas_subscriptions ss where ss.organization_id=o.id))
  and not exists(select 1 from public.extractor_accounts ea where ea.organization_id=o.id);

update public.organizations o
set product_scope='shared',updated_at=now()
where exists(select 1 from public.extractor_accounts ea where ea.organization_id=o.id)
  and (exists(select 1 from public.saas_company_fiscal_profiles sp where sp.organization_id=o.id)
    or exists(select 1 from public.saas_subscriptions ss where ss.organization_id=o.id));

create table if not exists public.extractor_plan_change_requests(
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.extractor_accounts(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  current_limit integer not null check(current_limit>=100),
  requested_limit integer not null check(requested_limit>=100),
  status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_note text
);
create index if not exists extractor_plan_change_requests_account_created_idx
  on public.extractor_plan_change_requests(account_id,created_at desc);
alter table public.extractor_plan_change_requests enable row level security;
revoke all on public.extractor_plan_change_requests from anon,authenticated;

create or replace function public.extractor_usage_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_account public.extractor_accounts%rowtype;
  v_start date;
  v_end date;
  v_used integer:=0;
  v_documents integer:=0;
  v_pending integer:=0;
  v_history jsonb:='[]'::jsonb;
  v_request jsonb:=null;
begin
  select ea.* into v_account
  from public.extractor_accounts ea
  where ea.status in ('trialing','active','past_due')
    and (private.is_extractor_member(ea.id,auth.uid()) or private.is_any_admin(auth.uid()))
  order by ea.created_at limit 1;
  if v_account.id is null then return null; end if;

  v_start:=coalesce(v_account.current_period_start,date_trunc('month',current_date)::date);
  v_end:=(v_start+interval '1 month')::date;

  select
    count(fd.id) filter(where fd.full_xml=true and fd.xml is not null)::integer,
    count(fd.id)::integer,
    count(fd.id) filter(where not(fd.full_xml=true and fd.xml is not null))::integer
  into v_used,v_documents,v_pending
  from public.extractor_companies ec
  join public.fiscal_dfe_documents fd on fd.company_id=ec.fiscal_company_id
  where ec.account_id=v_account.id and ec.status='active'
    and coalesce(fd.document_kind,'')<>'evento'
    and fd.issue_date>=v_start and fd.issue_date<v_end;

  select coalesce(jsonb_agg(jsonb_build_object(
    'month',to_char(x.month_start,'YYYY-MM'),
    'xml_used',x.xml_used,
    'documents',x.documents,
    'pending_xml',x.pending_xml
  ) order by x.month_start),'[]'::jsonb)
  into v_history
  from (
    select gs::date month_start,
      count(fd.id) filter(where fd.full_xml=true and fd.xml is not null)::integer xml_used,
      count(fd.id)::integer documents,
      count(fd.id) filter(where fd.id is not null and not(fd.full_xml=true and fd.xml is not null))::integer pending_xml
    from generate_series(date_trunc('month',current_date)-interval '5 months',date_trunc('month',current_date),interval '1 month') gs
    left join public.extractor_companies ec on ec.account_id=v_account.id and ec.status='active'
    left join public.fiscal_dfe_documents fd on fd.company_id=ec.fiscal_company_id
      and coalesce(fd.document_kind,'')<>'evento'
      and fd.issue_date>=gs and fd.issue_date<gs+interval '1 month'
    group by gs::date
  ) x;

  select jsonb_build_object('id',r.id,'requested_limit',r.requested_limit,'status',r.status,'created_at',r.created_at)
  into v_request
  from public.extractor_plan_change_requests r
  where r.account_id=v_account.id
  order by r.created_at desc limit 1;

  return jsonb_build_object(
    'account_id',v_account.id,
    'plan_code',v_account.plan_code,
    'period_start',v_start,
    'period_end',(v_end-1),
    'xml_used',coalesce(v_used,0),
    'xml_limit',v_account.monthly_xml_limit,
    'xml_remaining',greatest(v_account.monthly_xml_limit-coalesce(v_used,0),0),
    'usage_percent',case when v_account.monthly_xml_limit>0 then round((coalesce(v_used,0)::numeric*100)/v_account.monthly_xml_limit,1) else 0 end,
    'documents',coalesce(v_documents,0),
    'pending_xml',coalesce(v_pending,0),
    'history',v_history,
    'latest_plan_request',v_request
  );
end;
$$;

create or replace function public.extractor_request_plan_upgrade(_requested_limit integer)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_account public.extractor_accounts%rowtype;
  v_request_id uuid;
begin
  select ea.* into v_account
  from public.extractor_accounts ea
  where ea.status in ('trialing','active','past_due')
    and private.can_manage_extractor(ea.id,auth.uid())
  order by ea.created_at limit 1;
  if v_account.id is null then raise exception 'extractor_access_denied' using errcode='42501'; end if;
  if _requested_limit is null or _requested_limit<=v_account.monthly_xml_limit then
    return jsonb_build_object('ok',false,'code','LIMIT_NOT_HIGHER','message','O novo limite precisa ser maior que o limite atual.');
  end if;
  if _requested_limit>10000000 then
    return jsonb_build_object('ok',false,'code','LIMIT_TOO_HIGH','message','O limite solicitado excede a faixa suportada.');
  end if;

  select id into v_request_id
  from public.extractor_plan_change_requests
  where account_id=v_account.id and status='pending'
  order by created_at desc limit 1;

  if v_request_id is null then
    insert into public.extractor_plan_change_requests(account_id,requested_by,current_limit,requested_limit)
    values(v_account.id,auth.uid(),v_account.monthly_xml_limit,_requested_limit)
    returning id into v_request_id;
  else
    update public.extractor_plan_change_requests
    set requested_by=auth.uid(),current_limit=v_account.monthly_xml_limit,requested_limit=_requested_limit,updated_at=now()
    where id=v_request_id;
  end if;

  return jsonb_build_object('ok',true,'request_id',v_request_id,'requested_limit',_requested_limit,'status','pending');
end;
$$;

revoke execute on function public.extractor_usage_snapshot() from public,anon;
revoke execute on function public.extractor_request_plan_upgrade(integer) from public,anon;
grant execute on function public.extractor_usage_snapshot() to authenticated;
grant execute on function public.extractor_request_plan_upgrade(integer) to authenticated;
