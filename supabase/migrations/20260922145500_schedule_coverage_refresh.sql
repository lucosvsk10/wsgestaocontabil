do $$
declare v_job bigint;
begin
  for v_job in select jobid from cron.job where jobname='fiscal-coverage-refresh-every-30-minutes'
  loop
    perform cron.unschedule(v_job);
  end loop;

  perform cron.schedule(
    'fiscal-coverage-refresh-every-30-minutes',
    '5,35 * * * *',
    $cmd$
      select net.http_post(
        url := 'https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/fiscal-coverage-refresh',
        headers := jsonb_build_object(
          'content-type','application/json',
          'x-debug-token',(select token::text from public._fiscal_sales_debug_token where id=true)
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 120000
      );
    $cmd$
  );
end $$;
