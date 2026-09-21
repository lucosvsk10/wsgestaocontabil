do $$
declare v_job bigint;
begin
  for v_job in
    select jobid from cron.job where jobname='fiscal-state-credential-reverify-hourly'
  loop
    perform cron.unschedule(v_job);
  end loop;

  perform cron.schedule(
    'fiscal-state-credential-reverify-hourly',
    '17 * * * *',
    $cmd$
      select net.http_post(
        url := 'https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/fiscal-state-credential',
        headers := jsonb_build_object(
          'content-type','application/json',
          'x-debug-token',(select token::text from public._fiscal_sales_debug_token where id=true)
        ),
        body := jsonb_build_object('action','verify_due_internal'),
        timeout_milliseconds := 120000
      );
    $cmd$
  );
end $$;
