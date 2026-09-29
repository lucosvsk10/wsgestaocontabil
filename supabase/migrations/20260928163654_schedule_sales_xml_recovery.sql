create or replace function public.trigger_fiscal_sales_sp_xml_recovery()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_token text;
  v_company record;
  v_request_id bigint;
  v_request_ids bigint[] := '{}';
begin
  select token::text into v_token
  from public._fiscal_sales_debug_token
  where id = true;

  if coalesce(v_token, '') = '' then
    raise exception 'internal fiscal token missing';
  end if;

  for v_company in
    select distinct fc.id
    from public.fiscal_companies fc
    join public.extractor_companies ec
      on ec.fiscal_company_id = fc.id
     and ec.status = 'active'
    where fc.status = 'ativa'
      and upper(fc.uf) = 'SP'
  loop
    select net.http_post(
      url := 'https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/fiscal-sales-sp-xml-backfill',
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'x-debug-token', v_token
      ),
      body := jsonb_build_object('company_id', v_company.id, 'batch', 20),
      timeout_milliseconds := 120000
    ) into v_request_id;
    v_request_ids := array_append(v_request_ids, v_request_id);
  end loop;

  return jsonb_build_object('request_ids', v_request_ids);
end;
$function$;

revoke all on function public.trigger_fiscal_sales_sp_xml_recovery() from public, anon, authenticated;
grant execute on function public.trigger_fiscal_sales_sp_xml_recovery() to service_role;

do $$
declare
  v_job bigint;
begin
  for v_job in
    select jobid from cron.job where jobname in (
      'fiscal-sales-xml-recovery-al-every-10-minutes',
      'fiscal-sales-xml-recovery-sp-every-10-minutes',
      'fiscal-purchases-xml-recovery-every-10-minutes'
    )
  loop
    perform cron.unschedule(v_job);
  end loop;

  perform cron.schedule(
    'fiscal-sales-xml-recovery-al-every-10-minutes',
    '2,12,22,32,42,52 * * * *',
    $cmd$
      select net.http_post(
        url := 'https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/fiscal-sales-xml-backfill',
        headers := jsonb_build_object(
          'content-type', 'application/json',
          'x-debug-token', (select token::text from public._fiscal_sales_debug_token where id=true)
        ),
        body := jsonb_build_object('batch', 10),
        timeout_milliseconds := 120000
      );
    $cmd$
  );

  perform cron.schedule(
    'fiscal-sales-xml-recovery-sp-every-10-minutes',
    '5,15,25,35,45,55 * * * *',
    'select public.trigger_fiscal_sales_sp_xml_recovery();'
  );

  perform cron.schedule(
    'fiscal-purchases-xml-recovery-every-10-minutes',
    '8,18,28,38,48,58 * * * *',
    $cmd$
      select net.http_post(
        url := 'https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/fiscal-purchases-xml-backfill',
        headers := jsonb_build_object(
          'content-type', 'application/json',
          'x-debug-token', (select token::text from public._fiscal_sales_debug_token where id=true)
        ),
        body := jsonb_build_object('batch', 3),
        timeout_milliseconds := 120000
      );
    $cmd$
  );
end $$;
