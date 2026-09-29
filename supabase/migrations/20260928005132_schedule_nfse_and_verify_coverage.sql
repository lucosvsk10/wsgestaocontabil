-- A successful NFS-e request is not the same as exhausting the ADN cursor.
-- Persist the evidence needed to distinguish a caught-up source, a historical
-- backfill still advancing and a confirmed zero-result source.
alter table public.fiscal_nfse_sync_state
  add column if not exists source_exhausted boolean not null default false,
  add column if not exists last_caught_up_at timestamptz,
  add column if not exists last_run_documents integer not null default 0,
  add column if not exists last_run_events integer not null default 0,
  add column if not exists last_run_batches integer not null default 0,
  add column if not exists consecutive_failures integer not null default 0;

comment on column public.fiscal_nfse_sync_state.source_exhausted is
  'True only after the ADN source returns no next page (404, empty batch or a final partial batch).';
comment on column public.fiscal_nfse_sync_state.last_caught_up_at is
  'Most recent instant at which the available ADN cursor was demonstrably exhausted.';

-- The dispatcher is intentionally frequent. The Edge Function keeps a
-- per-company next_scheduled_at, so caught-up companies run every three hours
-- while a historical backfill gets another slice on the next five-minute tick.
do $block$
declare
  v_job bigint;
begin
  for v_job in
    select jobid
    from cron.job
    where jobname = 'fiscal-nfse-sync-every-5-minutes'
  loop
    perform cron.unschedule(v_job);
  end loop;

  perform cron.schedule(
    'fiscal-nfse-sync-every-5-minutes',
    '*/5 * * * *',
    'select public.trigger_fiscal_purchase_supplemental();'
  );
end
$block$;
