-- Reliable CNPJ.ws lookup fallback through pg_net.
-- Used only by service-role Edge Functions so browser clients cannot call the proxy directly.

create or replace function public.internal_company_registry_request(_cnpj text)
returns bigint
language plpgsql
security definer
set search_path = public, net
as $$
declare
  normalized text;
  request_id bigint;
begin
  normalized := regexp_replace(coalesce(_cnpj,''), '\D', '', 'g');
  if length(normalized) <> 14 then
    raise exception 'invalid_cnpj';
  end if;

  select net.http_get(
    url := 'https://publica.cnpj.ws/cnpj/' || normalized,
    headers := jsonb_build_object(
      'Accept','application/json',
      'User-Agent','WS-Gestao-Contabil/1.0'
    ),
    timeout_milliseconds := 20000
  )
  into request_id;

  return request_id;
end;
$$;

create or replace function public.internal_company_registry_response(_request_id bigint)
returns jsonb
language sql
security definer
set search_path = public, net
as $$
  select case
    when r.status_code between 200 and 299 then r.content::jsonb
    else jsonb_build_object('_error', true, '_status', r.status_code, '_content', r.content)
  end
  from net._http_response r
  where r.id = _request_id
  limit 1;
$$;

revoke all on function public.internal_company_registry_request(text) from public, anon, authenticated;
revoke all on function public.internal_company_registry_response(bigint) from public, anon, authenticated;
grant execute on function public.internal_company_registry_request(text) to service_role;
grant execute on function public.internal_company_registry_response(bigint) to service_role;

-- Reprocess AL CNPJ clients that still have no IE; the safe merge preserves manual fields.
update public.companies
set registry_updated_at = null
where document_type = 'cnpj'
  and upper(coalesce(state,'')) = 'AL'
  and coalesce(state_registration,'') = '';

do $cron$
declare
  existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'office-company-registry-sync-daily'
  limit 1;

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;

  perform cron.schedule(
    'office-company-registry-sync-daily',
    '7 * * * *',
    $cmd$
      select net.http_post(
        url := 'https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/admin-company-registry-sync',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-internal-token', (select token from public._company_registry_sync_token where id = true)
        ),
        body := jsonb_build_object('batch', 2, 'stale_days', 14),
        timeout_milliseconds := 120000
      );
    $cmd$
  );
end
$cron$;
