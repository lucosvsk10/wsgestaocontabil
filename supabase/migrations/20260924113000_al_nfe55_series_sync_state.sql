alter table public.fiscal_sales_sync_state
  add column if not exists nfe55_series_states jsonb not null default '{}'::jsonb;

comment on column public.fiscal_sales_sync_state.nfe55_series_states is
  'Estado independente da enumeração NF-e 55 por série em AL; não compartilha o cursor da NFC-e 65.';

do $$
declare v_job bigint;
begin
  for v_job in
    select jobid from cron.job where jobname = 'fiscal-sales-al-nfe55-every-30-minutes'
  loop
    perform cron.unschedule(v_job);
  end loop;

  perform cron.schedule(
    'fiscal-sales-al-nfe55-every-30-minutes',
    '12,42 * * * *',
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
