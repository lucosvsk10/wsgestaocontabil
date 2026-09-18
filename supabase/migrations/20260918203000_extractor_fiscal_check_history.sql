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
