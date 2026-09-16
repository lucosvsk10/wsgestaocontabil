create table if not exists public.fiscal_document_recovery_runs (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'running' check (status in ('running','completed','partial','cancelled')),
  window_start timestamptz not null,
  window_end timestamptz not null,
  total integer not null default 0,
  processed integer not null default 0,
  ready integer not null default 0,
  requires_manifestation integer not null default 0,
  failed integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists fiscal_document_recovery_runs_user_idx
  on public.fiscal_document_recovery_runs (requested_by, created_at desc);

create table if not exists public.fiscal_document_recovery_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.fiscal_document_recovery_runs(id) on delete cascade,
  company_id uuid not null references public.fiscal_companies(id) on delete cascade,
  document_id uuid not null references public.fiscal_dfe_documents(id) on delete cascade,
  access_key text,
  note_number text,
  series text,
  model text,
  direction text,
  issue_date timestamptz,
  position integer not null,
  status text not null default 'queued' check (status in ('queued','searching_xml','generating_danfe','ready','requires_manifestation','retry','failed')),
  message text,
  attempts integer not null default 0,
  pdf_verified boolean not null default false,
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (run_id, document_id)
);

create index if not exists fiscal_document_recovery_items_run_position_idx
  on public.fiscal_document_recovery_items (run_id, position);
create index if not exists fiscal_document_recovery_items_run_status_idx
  on public.fiscal_document_recovery_items (run_id, status, position);

alter table public.fiscal_document_recovery_runs enable row level security;
alter table public.fiscal_document_recovery_items enable row level security;
