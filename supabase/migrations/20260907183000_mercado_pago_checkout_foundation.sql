-- Mercado Pago Checkout Pro foundation.
-- Provider identifiers and webhook payload summaries are server-only.

alter table public.saas_invoices
  add column if not exists provider_payment_id text,
  add column if not exists provider_status text,
  add column if not exists provider_status_detail text,
  add column if not exists provider_updated_at timestamptz;

create unique index if not exists saas_invoices_provider_payment_uidx
  on public.saas_invoices(provider, provider_payment_id)
  where provider is not null and provider_payment_id is not null;

create table if not exists public.saas_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.saas_invoices(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete restrict,
  payment_method text not null check (payment_method in ('pix', 'card', 'boleto')),
  terms_accepted_at timestamptz not null,
  terms_version text not null default '2026-09-07',
  privacy_version text not null default '2026-09-07',
  idempotency_key uuid not null default gen_random_uuid() unique,
  preference_id text unique,
  checkout_url text,
  sandbox_checkout_url text,
  provider_request_id text,
  status text not null default 'creating'
    check (status in ('creating', 'ready', 'paid', 'failed', 'superseded')),
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists saas_payment_attempts_one_active_uidx
  on public.saas_payment_attempts(invoice_id)
  where status in ('creating', 'ready');

create index if not exists saas_payment_attempts_invoice_idx
  on public.saas_payment_attempts(invoice_id, created_at desc);

drop trigger if exists trg_saas_payment_attempts_updated_at on public.saas_payment_attempts;
create trigger trg_saas_payment_attempts_updated_at
  before update on public.saas_payment_attempts
  for each row execute function private.set_updated_at();

alter table public.saas_payment_attempts enable row level security;
revoke all on table public.saas_payment_attempts from public, anon, authenticated;
grant select, insert, update, delete on table public.saas_payment_attempts to service_role;
drop policy if exists saas_payment_attempts_server_only on public.saas_payment_attempts;
create policy saas_payment_attempts_server_only on public.saas_payment_attempts
  for all to anon, authenticated using (false) with check (false);

create table if not exists public.saas_payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'mercado_pago' check (provider = 'mercado_pago'),
  provider_event_id text not null,
  provider_payment_id text not null,
  invoice_id uuid references public.saas_invoices(id) on delete set null,
  action text,
  payment_status text,
  status_detail text,
  amount_cents bigint check (amount_cents is null or amount_cents >= 0),
  currency_id text,
  payment_type text,
  payment_method_id text,
  live_mode boolean,
  request_id text,
  signature_valid boolean not null default true,
  processed boolean not null default false,
  error_code text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, provider_event_id)
);

create index if not exists saas_payment_events_payment_idx
  on public.saas_payment_events(provider_payment_id, created_at desc);

create index if not exists saas_payment_events_invoice_idx
  on public.saas_payment_events(invoice_id, created_at desc);

alter table public.saas_payment_events enable row level security;
revoke all on table public.saas_payment_events from public, anon, authenticated;
grant select, insert, update, delete on table public.saas_payment_events to service_role;
drop policy if exists saas_payment_events_server_only on public.saas_payment_events;
create policy saas_payment_events_server_only on public.saas_payment_events
  for all to anon, authenticated using (false) with check (false);

comment on table public.saas_payment_attempts is
  'Server-only Mercado Pago Checkout Pro preference attempts.';
comment on table public.saas_payment_events is
  'Server-only, sanitized and idempotent Mercado Pago webhook history.';

create or replace function public.apply_mercado_pago_payment_event(
  p_provider_event_id text,
  p_provider_payment_id text,
  p_invoice_id uuid,
  p_action text,
  p_payment_status text,
  p_status_detail text,
  p_amount_cents bigint,
  p_currency_id text,
  p_payment_type text,
  p_payment_method_id text,
  p_live_mode boolean,
  p_request_id text,
  p_paid_at timestamptz
) returns table (applied boolean, reason text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_invoice public.saas_invoices%rowtype;
  v_event_id uuid;
  v_internal_method text;
  v_next_status text;
  v_next_paid_at timestamptz;
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'service role only';
  end if;

  select * into v_invoice
  from public.saas_invoices
  where id = p_invoice_id
  for update;

  if not found then
    return query select false, 'invoice_not_found'::text;
    return;
  end if;

  insert into public.saas_payment_events (
    provider_event_id, provider_payment_id, invoice_id, action,
    payment_status, status_detail, amount_cents, currency_id,
    payment_type, payment_method_id, live_mode, request_id
  ) values (
    p_provider_event_id, p_provider_payment_id, p_invoice_id, left(p_action, 120),
    left(p_payment_status, 60), left(p_status_detail, 120), p_amount_cents,
    upper(left(p_currency_id, 3)), left(p_payment_type, 60),
    left(p_payment_method_id, 80), p_live_mode, left(p_request_id, 160)
  )
  on conflict (provider, provider_event_id) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return query select false, 'duplicate_event'::text;
    return;
  end if;

  if upper(coalesce(p_currency_id, '')) <> 'BRL' then
    update public.saas_payment_events
      set error_code = 'currency_mismatch'
      where id = v_event_id;
    return query select false, 'currency_mismatch'::text;
    return;
  end if;

  if v_invoice.total_cents is null or v_invoice.total_cents <= 0
     or p_amount_cents is distinct from v_invoice.total_cents then
    update public.saas_payment_events
      set error_code = 'amount_mismatch'
      where id = v_event_id;
    return query select false, 'amount_mismatch'::text;
    return;
  end if;

  v_internal_method := case
    when lower(coalesce(p_payment_method_id, '')) = 'pix' then 'pix'
    when lower(coalesce(p_payment_type, '')) in ('credit_card', 'debit_card', 'prepaid_card') then 'card'
    when lower(coalesce(p_payment_type, '')) = 'ticket' then 'boleto'
    else v_invoice.payment_method
  end;

  v_next_status := case
    when p_payment_status = 'approved' then 'paid'
    when p_payment_status in ('pending', 'in_process', 'authorized') then 'open'
    when p_payment_status in ('rejected', 'cancelled', 'refunded', 'charged_back') then 'open'
    else v_invoice.status
  end;

  v_next_paid_at := case
    when p_payment_status = 'approved' then coalesce(p_paid_at, now())
    else null
  end;

  update public.saas_invoices
  set provider = 'mercado_pago',
      provider_payment_id = p_provider_payment_id,
      provider_status = p_payment_status,
      provider_status_detail = p_status_detail,
      provider_updated_at = now(),
      payment_method = v_internal_method,
      status = v_next_status,
      paid_at = v_next_paid_at,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'mercado_pago', jsonb_build_object(
          'payment_id', p_provider_payment_id,
          'status', p_payment_status,
          'status_detail', p_status_detail,
          'updated_at', now()
        )
      )
  where id = p_invoice_id;

  if p_payment_status = 'approved' then
    update public.saas_payment_attempts
      set status = 'paid'
      where invoice_id = p_invoice_id and status in ('creating', 'ready');
  end if;

  update public.saas_payment_events
    set processed = true, processed_at = now()
    where id = v_event_id;

  return query select true, 'applied'::text;
end;
$$;

revoke all on function public.apply_mercado_pago_payment_event(
  text, text, uuid, text, text, text, bigint, text, text, text,
  boolean, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.apply_mercado_pago_payment_event(
  text, text, uuid, text, text, text, bigint, text, text, text,
  boolean, text, timestamptz
) to service_role;
