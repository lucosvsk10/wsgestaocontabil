create or replace function public.trigger_fiscal_transport_dfe_cron()
returns bigint
language plpgsql
security definer
set search_path to 'public','extensions'
as $$
declare
  request_id bigint;
  tok text;
begin
  select token into tok from public._fiscal_sales_debug_token where id=true;
  if tok is null then
    raise exception 'Internal fiscal token missing';
  end if;

  select net.http_post(
    url := 'https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/fiscal-transport-dfe-sync',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-debug-token',tok
    ),
    body := jsonb_build_object('limit',2,'max_batches',4),
    timeout_milliseconds := 120000
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function public.trigger_fiscal_transport_dfe_cron() from public, anon, authenticated;
grant execute on function public.trigger_fiscal_transport_dfe_cron() to service_role;

do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname='fiscal-transport-dfe-sync-every-5-minutes' limit 1;
  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
  perform cron.schedule(
    'fiscal-transport-dfe-sync-every-5-minutes',
    '*/5 * * * *',
    'select public.trigger_fiscal_transport_dfe_cron();'
  );
end $$;
