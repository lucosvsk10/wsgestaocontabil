alter table public.saas_billing_checkouts
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text not null default '2026-09-11',
  add column if not exists privacy_version text not null default '2026-09-11';

comment on column public.saas_billing_checkouts.terms_accepted_at is
  'Server-recorded consent timestamp submitted immediately before opening Mercado Pago.';
