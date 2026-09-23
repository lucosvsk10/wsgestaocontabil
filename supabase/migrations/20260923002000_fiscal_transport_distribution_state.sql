create table if not exists public.fiscal_transport_sync_state (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.fiscal_companies(id) on delete cascade,
  document_family text not null check (document_family in ('cte57','mdfe58')),
  environment text not null default 'producao' check (environment in ('producao','homologacao')),
  ult_nsu text not null default '000000000000000',
  max_nsu text not null default '000000000000000',
  last_status_code text,
  last_status_message text,
  last_synced_at timestamptz,
  last_completed_at timestamptz,
  cooldown_until timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id,document_family,environment)
);

create index if not exists fiscal_transport_sync_state_due_idx
  on public.fiscal_transport_sync_state(document_family,cooldown_until,last_synced_at);

alter table public.fiscal_transport_sync_state enable row level security;

comment on table public.fiscal_transport_sync_state is
  'Independent official-distribution cursors for CT-e and MDF-e in the Extrator. Internal service-role access only.';
