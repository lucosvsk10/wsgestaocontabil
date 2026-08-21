create table if not exists public.accounting_mapping_rules (
  id uuid primary key default gen_random_uuid(),
  company_key text not null,
  module text not null default 'folha',
  signature text not null,
  rubric_code text not null default '',
  rubric_description text not null default '',
  normalized_description text not null default '',
  section text not null default '',
  kind text not null default '',
  event_type text not null default '',
  debit_code text not null,
  debit_description text not null default '',
  debit_cost_center text not null default '',
  credit_code text not null,
  credit_description text not null default '',
  credit_cost_center text not null default '',
  history_template text not null default '',
  source text not null default 'user_approved',
  times_used integer not null default 0,
  times_confirmed integer not null default 1,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounting_mapping_rules_company_module_signature_key unique (company_key, module, signature)
);

create index if not exists accounting_mapping_rules_company_module_idx
  on public.accounting_mapping_rules(company_key, module)
  where is_active = true;

create index if not exists accounting_mapping_rules_rubric_idx
  on public.accounting_mapping_rules(company_key, module, rubric_code, section, kind)
  where is_active = true;

alter table public.accounting_mapping_rules enable row level security;

create policy "accounting mapping rules readable by authenticated"
  on public.accounting_mapping_rules for select
  to authenticated
  using (true);

comment on table public.accounting_mapping_rules is
  'Mapeamentos contabeis aprovados pelo usuario. Codigos de conta sao isolados por empresa; a IA pode sugerir novos mapeamentos, mas eles so viram regra depois de aprovados.';
