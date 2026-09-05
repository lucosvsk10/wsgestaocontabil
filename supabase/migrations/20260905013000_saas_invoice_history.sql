create table if not exists public.saas_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number bigint generated always as identity unique,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid references public.saas_subscriptions(id) on delete set null,
  provider text,
  provider_invoice_id text,
  description text not null default 'Assinatura do emissor fiscal',
  line_items jsonb not null default '[]'::jsonb check (jsonb_typeof(line_items) = 'array'),
  period_start date not null,
  period_end date not null,
  due_date date,
  subtotal_cents bigint check (subtotal_cents is null or subtotal_cents >= 0),
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  total_cents bigint check (total_cents is null or total_cents >= 0),
  status text not null default 'open' check (status in ('draft','open','paid','overdue','canceled','void')),
  payment_method text,
  paid_at timestamptz,
  checkout_url text,
  receipt_path text,
  fiscal_note_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start),
  unique (organization_id, period_start, period_end)
);

create index if not exists saas_invoices_org_period_idx on public.saas_invoices(organization_id, period_start desc);
create index if not exists saas_invoices_org_status_idx on public.saas_invoices(organization_id, status, due_date desc);
create unique index if not exists saas_invoices_provider_invoice_uidx on public.saas_invoices(provider, provider_invoice_id) where provider is not null and provider_invoice_id is not null;

drop trigger if exists trg_saas_invoices_updated_at on public.saas_invoices;
create trigger trg_saas_invoices_updated_at before update on public.saas_invoices for each row execute function private.set_updated_at();

drop trigger if exists trg_audit_saas_invoices on public.saas_invoices;
create trigger trg_audit_saas_invoices after insert or update or delete on public.saas_invoices for each row execute function private.audit_saas_sensitive_change();

alter table public.saas_invoices enable row level security;

drop policy if exists "saas_invoices_read_members" on public.saas_invoices;
create policy "saas_invoices_read_members" on public.saas_invoices for select to authenticated
using (private.is_org_member(organization_id, auth.uid()) or private.is_any_admin(auth.uid()));

drop policy if exists "saas_invoices_admin_manage" on public.saas_invoices;
create policy "saas_invoices_admin_manage" on public.saas_invoices for all to authenticated
using (private.is_any_admin(auth.uid())) with check (private.is_any_admin(auth.uid()));

grant select on public.saas_invoices to authenticated;
revoke insert, update, delete on public.saas_invoices from anon, authenticated;
