create table if not exists public.fiscal_extractor_coverage (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.fiscal_companies(id) on delete cascade,
  document_type text not null,
  direction text not null check (direction in ('entrada','saida','eventos')),
  applicability text not null default 'required' check (applicability in ('required','observed','unknown','not_applicable')),
  source_name text,
  source_mode text,
  coverage_status text not null default 'unknown' check (coverage_status in ('covered','partial','blocked','error','unknown','not_applicable')),
  source_confirmed boolean not null default false,
  last_verified_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id,document_type,direction)
);

create index if not exists fiscal_extractor_coverage_company_idx
  on public.fiscal_extractor_coverage(company_id,coverage_status);

alter table public.fiscal_extractor_coverage enable row level security;

comment on table public.fiscal_extractor_coverage is
  'Coverage matrix by company/document/direction. A company is never complete while a required row is blocked, error, partial or unknown.';

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname='fiscal_source_reconciliation_document_type_check'
  ) then
    alter table public.fiscal_source_reconciliation
      drop constraint fiscal_source_reconciliation_document_type_check;
  end if;
end $$;

alter table public.fiscal_source_reconciliation
  add constraint fiscal_source_reconciliation_document_type_check
  check (document_type in (
    'purchase_nfe55','sale_nfe55',
    'purchase_nfce65','sale_nfce65',
    'purchase_nfse','sale_nfse',
    'purchase_cte57','sale_cte57',
    'sale_mdfe58',
    'event_nfe','event_nfce','event_cte','event_mdfe'
  ));
