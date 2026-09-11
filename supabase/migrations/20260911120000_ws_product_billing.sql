-- Product-aware billing for Mercado Pago subscriptions and 30-day purchases.

alter table public.saas_plans
  add column if not exists product_code text,
  add column if not exists price_cents bigint,
  add column if not exists trial_days integer not null default 0;

alter table public.saas_plans drop constraint if exists saas_plans_product_code_check;
alter table public.saas_plans add constraint saas_plans_product_code_check
  check (product_code is null or product_code in ('issuer', 'extractor'));
alter table public.saas_plans drop constraint if exists saas_plans_price_cents_check;
alter table public.saas_plans add constraint saas_plans_price_cents_check
  check (price_cents is null or price_cents > 0);
alter table public.saas_plans drop constraint if exists saas_plans_trial_days_check;
alter table public.saas_plans add constraint saas_plans_trial_days_check
  check (trial_days between 0 and 30);

insert into public.saas_plans(code, name, status, product_code, price_cents, trial_days, features, limits)
values
  ('issuer_monthly', 'Emissor Fiscal', 'active', 'issuer', 6900, 7,
    '{"unlimited_issuance":true,"documents":["nfe","nfce","nfse","cte","mdfe"]}'::jsonb,
    '{"monthly_documents":null}'::jsonb),
  ('extractor_commercial', 'Extrator Comercial', 'active', 'extractor', 9900, 7,
    '{"purchases":true,"sales":true,"xml_download":true}'::jsonb,
    '{"monthly_xml":20000}'::jsonb),
  ('extractor_enterprise', 'Extrator Empresarial', 'active', 'extractor', 25000, 7,
    '{"purchases":true,"sales":true,"xml_download":true,"unlimited":true}'::jsonb,
    '{"monthly_xml":null,"companies":null}'::jsonb)
on conflict (code) do update set
  name = excluded.name, status = excluded.status, product_code = excluded.product_code,
  price_cents = excluded.price_cents, trial_days = excluded.trial_days,
  features = excluded.features, limits = excluded.limits, updated_at = now();

alter table public.saas_subscriptions
  add column if not exists product_code text,
  add column if not exists billing_mode text not null default 'recurring',
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists access_expires_at timestamptz,
  add column if not exists provider_status text;

update public.saas_subscriptions s
set product_code = coalesce(p.product_code, 'issuer')
from public.saas_plans p
where p.id = s.plan_id and s.product_code is null;

alter table public.saas_subscriptions alter column product_code set not null;
alter table public.saas_subscriptions drop constraint if exists saas_subscriptions_product_code_check;
alter table public.saas_subscriptions add constraint saas_subscriptions_product_code_check
  check (product_code in ('issuer', 'extractor'));
alter table public.saas_subscriptions drop constraint if exists saas_subscriptions_billing_mode_check;
alter table public.saas_subscriptions add constraint saas_subscriptions_billing_mode_check
  check (billing_mode in ('recurring', 'one_time'));

drop index if exists public.saas_subscriptions_one_live_per_org;
create unique index if not exists saas_subscriptions_one_live_per_org_product
  on public.saas_subscriptions(organization_id, product_code)
  where status in ('trialing','active','past_due','paused','incomplete');
create unique index if not exists saas_subscriptions_provider_uidx
  on public.saas_subscriptions(provider, provider_subscription_id)
  where provider is not null and provider_subscription_id is not null;

alter table public.saas_invoices
  drop constraint if exists saas_invoices_organization_id_period_start_period_end_key;
create unique index if not exists saas_invoices_subscription_period_uidx
  on public.saas_invoices(subscription_id, period_start, period_end)
  where subscription_id is not null;

create table if not exists public.saas_trial_redemptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_code text not null check (product_code in ('issuer', 'extractor')),
  user_id uuid not null references auth.users(id) on delete restrict,
  subscription_id uuid references public.saas_subscriptions(id) on delete set null,
  redeemed_at timestamptz not null default now(),
  unique (organization_id, product_code),
  unique (user_id, product_code)
);

create table if not exists public.saas_billing_checkouts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid not null references public.saas_subscriptions(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete restrict,
  billing_mode text not null check (billing_mode in ('recurring', 'one_time')),
  idempotency_key uuid not null default gen_random_uuid() unique,
  provider_reference text,
  checkout_url text,
  status text not null default 'creating' check (status in ('creating','ready','completed','failed','expired')),
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists saas_billing_checkouts_subscription_idx
  on public.saas_billing_checkouts(subscription_id, created_at desc);

alter table public.saas_trial_redemptions enable row level security;
alter table public.saas_billing_checkouts enable row level security;
revoke all on public.saas_trial_redemptions, public.saas_billing_checkouts from public, anon, authenticated;
grant select, insert, update, delete on public.saas_trial_redemptions, public.saas_billing_checkouts to service_role;
create policy saas_trial_redemptions_server_only on public.saas_trial_redemptions
  for all to anon, authenticated using (false) with check (false);
create policy saas_billing_checkouts_server_only on public.saas_billing_checkouts
  for all to anon, authenticated using (false) with check (false);

drop trigger if exists trg_saas_billing_checkouts_updated_at on public.saas_billing_checkouts;
create trigger trg_saas_billing_checkouts_updated_at before update on public.saas_billing_checkouts
  for each row execute function private.set_updated_at();

create or replace function public.sync_ws_subscription_access(
  p_subscription_id uuid,
  p_provider_subscription_id text,
  p_provider_status text,
  p_period_start timestamptz,
  p_period_end timestamptz
) returns void
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_sub public.saas_subscriptions%rowtype; v_status text; v_limit integer;
begin
  if current_user not in ('service_role','postgres','supabase_admin') then raise exception 'service role only'; end if;
  select * into v_sub from public.saas_subscriptions where id = p_subscription_id for update;
  if not found then return; end if;
  v_status := case
    when lower(p_provider_status) = 'authorized' and v_sub.trial_ends_at > now() then 'trialing'
    when lower(p_provider_status) = 'authorized' then 'active'
    when lower(p_provider_status) in ('paused') then 'paused'
    when lower(p_provider_status) in ('cancelled','canceled') then 'canceled'
    else 'incomplete' end;
  update public.saas_subscriptions set
    provider = 'mercado_pago', provider_subscription_id = coalesce(nullif(p_provider_subscription_id,''), provider_subscription_id),
    provider_status = left(p_provider_status, 60), status = v_status,
    current_period_start = coalesce(p_period_start, current_period_start),
    current_period_end = coalesce(p_period_end, current_period_end),
    access_expires_at = case when v_status in ('trialing','active') then coalesce(p_period_end, trial_ends_at, access_expires_at) else access_expires_at end
  where id = p_subscription_id;
  if v_sub.product_code = 'extractor' then
    select coalesce((limits->>'monthly_xml')::integer, 10000000) into v_limit from public.saas_plans where id = v_sub.plan_id;
    insert into public.extractor_accounts(organization_id,name,status,plan_code,monthly_xml_limit,base_lookback_days,current_period_start,access_source,access_expires_at,lifetime_access)
    select v_sub.organization_id, o.name, case when v_status in ('trialing','active') then 'active' else 'suspended' end,
      p.code, v_limit, 30, coalesce(p_period_start, now())::date, 'billing',
      coalesce(p_period_end, v_sub.trial_ends_at), false
    from public.organizations o join public.saas_plans p on p.id = v_sub.plan_id where o.id = v_sub.organization_id
    on conflict (organization_id) do update set status=excluded.status, plan_code=excluded.plan_code,
      monthly_xml_limit=excluded.monthly_xml_limit, current_period_start=excluded.current_period_start,
      access_source='billing', access_expires_at=excluded.access_expires_at, lifetime_access=false, updated_at=now();
  end if;
end;
$$;

create or replace function public.activate_ws_paid_invoice(p_invoice_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_invoice public.saas_invoices%rowtype; v_sub public.saas_subscriptions%rowtype; v_start timestamptz; v_end timestamptz;
begin
  if current_user not in ('service_role','postgres','supabase_admin') then raise exception 'service role only'; end if;
  select * into v_invoice from public.saas_invoices where id=p_invoice_id and status='paid' for update;
  if not found or v_invoice.subscription_id is null then return; end if;
  select * into v_sub from public.saas_subscriptions where id=v_invoice.subscription_id for update;
  v_start := greatest(now(), coalesce(v_sub.access_expires_at, now()));
  v_end := case when v_sub.billing_mode='one_time' then v_start + interval '30 days' else v_start + interval '1 month' end;
  update public.saas_subscriptions set status='active', current_period_start=v_start,
    current_period_end=v_end, access_expires_at=v_end where id=v_sub.id;
  perform public.sync_ws_subscription_access(v_sub.id, coalesce(v_sub.provider_subscription_id,''), 'authorized', v_start, v_end);
end;
$$;

revoke all on function public.sync_ws_subscription_access(uuid,text,text,timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function public.activate_ws_paid_invoice(uuid) from public,anon,authenticated;
grant execute on function public.sync_ws_subscription_access(uuid,text,text,timestamptz,timestamptz) to service_role;
grant execute on function public.activate_ws_paid_invoice(uuid) to service_role;

comment on table public.saas_trial_redemptions is 'Server-only ledger enforcing one free trial per user and organization for each WS product.';
comment on table public.saas_billing_checkouts is 'Server-only idempotency and provider checkout ledger.';
