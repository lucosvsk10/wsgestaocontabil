create table if not exists public.fiscal_source_reconciliation (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.fiscal_companies(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  document_type text not null check (document_type in ('purchase_nfe55','sale_nfe55','sale_nfce65','purchase_nfse','sale_nfse')),
  source_name text not null,
  source_confirmed boolean not null default false,
  source_count integer,
  site_count integer not null default 0,
  missing_count integer not null default 0,
  extra_count integer not null default 0,
  xml_pending_count integer not null default 0,
  missing_keys jsonb not null default '[]'::jsonb,
  extra_keys jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('ok','pending','blocked','error')),
  reason text,
  details jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id,period_start,period_end,document_type)
);

create index if not exists fiscal_source_reconciliation_period_idx
  on public.fiscal_source_reconciliation(period_start,period_end,status);
create index if not exists fiscal_source_reconciliation_company_idx
  on public.fiscal_source_reconciliation(company_id,checked_at desc);

alter table public.fiscal_source_reconciliation enable row level security;

comment on table public.fiscal_source_reconciliation is
  'Persistent reconciliation between official fiscal sources and documents displayed by the Extractor.';
