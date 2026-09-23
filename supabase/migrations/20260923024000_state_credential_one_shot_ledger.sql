create table if not exists public.fiscal_state_credential_attempts (
  company_id uuid not null references public.fiscal_companies(id) on delete cascade,
  uf text not null,
  strategy text not null,
  attempted_at timestamptz not null default now(),
  outcome text,
  request_id bigint,
  details jsonb not null default '{}'::jsonb,
  primary key (company_id, uf, strategy)
);
alter table public.fiscal_state_credential_attempts enable row level security;
comment on table public.fiscal_state_credential_attempts is
  'Internal one-shot ledger for operator-authorized state portal credential attempts. Stores no credential material.';
