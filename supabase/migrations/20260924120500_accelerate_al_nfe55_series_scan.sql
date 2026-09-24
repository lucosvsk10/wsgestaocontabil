do $$
declare v_job bigint;
begin
  for v_job in
    select jobid from cron.job
    where jobname in ('fiscal-sales-al-nfe55-every-30-minutes','fiscal-sales-al-nfe55-every-15-minutes')
  loop
    perform cron.unschedule(v_job);
  end loop;

  perform cron.schedule(
    'fiscal-sales-al-nfe55-every-15-minutes',
    '2,17,32,47 * * * *',
    $cmd$
      select net.http_post(
        url := 'https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/fiscal-sales-al-nfe55-cron',
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
