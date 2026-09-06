-- Payment amounts and provider state are server-controlled. Browser clients
-- receive only the fields required to render their own invoices.

revoke all on table public.saas_invoices from anon;
revoke all on table public.saas_invoices from authenticated;

grant select (
  id, invoice_number, organization_id, description, line_items,
  period_start, period_end, due_date, subtotal_cents, discount_cents,
  total_cents, status, payment_method, paid_at, receipt_path,
  fiscal_note_path, created_at, updated_at
) on table public.saas_invoices to authenticated;

drop policy if exists saas_invoices_admin_manage on public.saas_invoices;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.saas_invoices'::regclass
      and conname = 'saas_invoices_payment_method_check'
  ) then
    alter table public.saas_invoices
      add constraint saas_invoices_payment_method_check
      check (payment_method is null or payment_method in ('pix', 'card', 'boleto'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.saas_invoices'::regclass
      and conname = 'saas_invoices_provider_check'
  ) then
    alter table public.saas_invoices
      add constraint saas_invoices_provider_check
      check (provider is null or provider = 'mercado_pago');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.saas_invoices'::regclass
      and conname = 'saas_invoices_paid_state_check'
  ) then
    alter table public.saas_invoices
      add constraint saas_invoices_paid_state_check
      check ((status = 'paid') = (paid_at is not null));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.saas_invoices'::regclass
      and conname = 'saas_invoices_payable_total_check'
  ) then
    alter table public.saas_invoices
      add constraint saas_invoices_payable_total_check
      check (status not in ('open', 'overdue', 'paid') or total_cents > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.saas_invoices'::regclass
      and conname = 'saas_invoices_checkout_url_check'
  ) then
    alter table public.saas_invoices
      add constraint saas_invoices_checkout_url_check
      check (
        checkout_url is null
        or checkout_url ~ '^/app/checkout/[0-9a-fA-F-]{36}$'
        or checkout_url ~ '^https://([a-zA-Z0-9-]+\.)*mercadopago\.com(\.br)?/'
      );
  end if;
end;
$$;

comment on column public.saas_invoices.metadata is
  'Backend-only payment metadata. Never granted to browser roles.';
comment on column public.saas_invoices.provider_invoice_id is
  'Backend-only provider identifier. Updated only after verified provider responses.';
