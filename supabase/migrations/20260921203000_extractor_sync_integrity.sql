-- Keep sales bootstrap/recovery moving without hammering healthy companies.
do $$
declare v_job bigint;
begin
  for v_job in select jobid from cron.job where jobname in ('fiscal-sales-sync-every-3-hours','fiscal-sales-sync-every-15-minutes')
  loop
    perform cron.unschedule(v_job);
  end loop;

  perform cron.schedule(
    'fiscal-sales-sync-every-15-minutes',
    '*/15 * * * *',
    'select public.trigger_fiscal_sales_cron();'
  );

  for v_job in select jobid from cron.job where jobname='fiscal-health-sentinel-every-30-minutes'
  loop
    perform cron.unschedule(v_job);
  end loop;

  perform cron.schedule(
    'fiscal-health-sentinel-every-30-minutes',
    '*/30 * * * *',
    $cmd$
      select net.http_post(
        url := 'https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/fiscal-health-daily-cron',
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'x-debug-token',(select token::text from public._fiscal_sales_debug_token where id=true)
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 120000
      );
    $cmd$
  );
end $$;

-- Requeue stalled sale states so the new router/bootstrap sees them immediately.
update public.fiscal_sales_sync_state s
set
  status = case
    when s.paused then s.status
    when s.status in ('waiting_sales_reference','queued','retrying','unsupported_source') then 'queued'
    else s.status
  end,
  next_scheduled_at = case when s.paused then s.next_scheduled_at else now() end,
  updated_at = now()
where exists (
  select 1
  from public.fiscal_companies fc
  join public.extractor_companies ec on ec.fiscal_company_id=fc.id and ec.status='active'
  where fc.id=s.company_id and fc.status='ativa'
);
