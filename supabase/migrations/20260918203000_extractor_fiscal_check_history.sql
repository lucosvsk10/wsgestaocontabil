-- Extrator audit history: persistent, comparable snapshots of fiscal checks.
-- Operational extraction remains month-before + current month. This table records
-- audit scopes independently (last 30 days or all history already available).

create table if not exists public.extractor_fiscal_check_runs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.extractor_accounts(id) on delete cascade,
  company_id uuid not null references public.fiscal_companies(id) on delete cascade,
  scope text not null check (scope in ('last_30_days','full')),
  period_start date not null,
  period_end date not null,
  purchases_expected integer,
  purchases_present integer not null default 0,
  sales_expected integer,
  sales_present integer not null default 0,
  state text not null check (state in ('healthy','attention','error')),
  origin text not null default 'manual_check' check (origin in ('manual_check','post_sync','automatic')),
  details jsonb not null default '{}'::jsonb,
  requested_by uuid,
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists extractor_fiscal_check_runs_company_checked_idx
  on public.extractor_fiscal_check_runs(company_id, checked_at desc);

create index if not exists extractor_fiscal_check_runs_account_checked_idx
  on public.extractor_fiscal_check_runs(account_id, checked_at desc);

alter table public.extractor_fiscal_check_runs enable row level security;

revoke all on table public.extractor_fiscal_check_runs from public, anon, authenticated;
grant select, insert, update, delete on table public.extractor_fiscal_check_runs to service_role;

comment on table public.extractor_fiscal_check_runs is
  'Immutable-style audit snapshots shown in Extrator > Histórico. Audit scope is independent from the normal extraction window.';


create or replace function public.extractor_document_access(p_user_id uuid,p_company_id uuid)
returns jsonb
language plpgsql
stable
set search_path to ''
as $function$
declare
  v_account public.extractor_accounts%rowtype;
begin
  if p_user_id is null or p_company_id is null then
    return jsonb_build_object('allowed',false);
  end if;

  select ea.* into v_account
  from public.extractor_accounts ea
  join public.extractor_companies ec on ec.account_id=ea.id
  where ec.fiscal_company_id=p_company_id
    and ec.status='active'
    and private.is_extractor_member(ea.id,p_user_id)
  order by ea.created_at
  limit 1;

  if v_account.id is not null then
    return jsonb_build_object(
      'allowed',true,
      'account_id',v_account.id,
      'from',public.extractor_minimum_history_start(),
      'to',public.extractor_local_date()
    );
  end if;

  return jsonb_build_object('allowed',false);
end;
$function$;
