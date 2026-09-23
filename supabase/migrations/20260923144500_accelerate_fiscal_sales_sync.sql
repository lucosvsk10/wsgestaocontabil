do $$
declare v_job bigint;
begin
  for v_job in
    select jobid from cron.job
    where jobname in ('fiscal-sales-sync-every-15-minutes','fiscal-sales-sync-every-5-minutes')
  loop
    perform cron.unschedule(v_job);
  end loop;

  perform cron.schedule(
    'fiscal-sales-sync-every-5-minutes',
    '*/5 * * * *',
    'select public.trigger_fiscal_sales_cron();'
  );
end $$;
