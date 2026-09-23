alter table public.fiscal_sales_sync_state
  add column if not exists nfce_source_status text,
  add column if not exists nfce_source_confirmed_at timestamptz,
  add column if not exists nfce_source_period_start timestamptz,
  add column if not exists nfce_source_period_end timestamptz,
  add column if not exists nfce_source_count integer,
  add column if not exists nfce_source_error text;

comment on column public.fiscal_sales_sync_state.nfce_source_status is
  'Independent status of the official NFC-e issuer source, decoupled from NF-e 55 recovery.';
