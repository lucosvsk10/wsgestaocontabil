-- Fiscal transport cutover: government network I/O must not run in the
-- supplemental purchase scheduler. NF-e/NFC-e distribution and XML recovery
-- use the Vercel gateways; the SEFAZ/AL report remains available only as a
-- manual diagnostic fallback while it is replaced by a Node gateway.
create or replace function public.trigger_fiscal_purchase_supplemental()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_token text;
  v_id bigint;
  v_ids bigint[] := '{}';
begin
  select token into v_token
  from public._fiscal_sales_debug_token
  where id = true;

  if coalesce(v_token, '') = '' then
    raise exception 'internal fiscal token missing';
  end if;

  -- NFS-e national distribution is the only remaining supplemental source.
  -- NF-e purchases are handled by fiscal-purchases-cron -> Vercel DFe bridge,
  -- and XML recovery by fiscal-purchases-xml-backfill -> Vercel SVRS bridge.
  select net.http_post(
    url := 'https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/fiscal-nfse-purchases-cron',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-debug-token', v_token
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  ) into v_id;

  v_ids := array_append(v_ids, v_id);
  return jsonb_build_object('request_ids', v_ids, 'direct_sefaz_al_report', false);
end;
$function$;
