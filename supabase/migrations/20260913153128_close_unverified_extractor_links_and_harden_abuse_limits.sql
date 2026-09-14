-- Close unverified company linking and anonymous public-asset writes.
revoke all on function public.extractor_link_company_by_cnpj(text) from public, anon, authenticated;
revoke insert, update, delete on public.extractor_companies from public, anon, authenticated;
drop policy if exists "Temporary anon upload public-site-assets" on storage.objects;

-- Serialize initial bucket creation as well as increments: the old SELECT FOR UPDATE
-- did not lock a missing row, allowing concurrent first requests to reset the count.
do $migration$
declare definition text;
begin
  select pg_get_functiondef('public.consume_rate_limit(text,text,integer,integer)'::regprocedure) into definition;
  if position('v_hash := md5(p_scope || ' in definition)=0 then raise exception 'Unexpected rate limiter definition'; end if;
  definition := replace(definition,
    'v_hash := md5(p_scope || '':'' || p_key);',
    'v_hash := md5(p_scope || '':'' || p_key);' || chr(10) ||
    '  perform pg_advisory_xact_lock(hashtextextended(v_hash, 0));' || chr(10) ||
    '  v_now := clock_timestamp();');
  if position('pg_advisory_xact_lock' in definition)=0 then raise exception 'Rate limiter patch not applied'; end if;
  execute definition;
end;
$migration$;

-- Cooldown for manual sync; keep scheduled backoff instead of forcing an immediate retry.
do $migration$
declare definition text;
begin
  select pg_get_functiondef('public.extractor_queue_sync(uuid)'::regprocedure) into definition;
  if position('v_count integer := 0;' in definition)=0 then raise exception 'Unexpected sync definition'; end if;
  definition := replace(definition,'v_count integer := 0;','v_count integer := 0;' || chr(10) || '  v_rate record;');
  definition := replace(definition,'  for v_company in',
    '  select * into v_rate from public.consume_rate_limit(''extractor_manual_sync'', auth.uid()::text || ''|'' || v_account.id::text, 3, 300);' || chr(10) ||
    '  if not v_rate.allowed then return jsonb_build_object(''ok'',false,''code'',''RATE_LIMITED'',''message'',''Aguarde antes de solicitar outra sincronização.'',''retry_after_seconds'',v_rate.retry_after_seconds); end if;' || chr(10) ||
    '  for v_company in');
  definition := replace(definition,'next_scheduled_at = now(),','next_scheduled_at = greatest(public.fiscal_purchase_sync_state.next_scheduled_at, now()),');
  -- The second upsert belongs to sales, not purchases.
  definition := replace(definition,
    'next_scheduled_at = greatest(public.fiscal_purchase_sync_state.next_scheduled_at, now()),' || chr(10) || '      updated_at = now();' || chr(10) || chr(10) || '    v_count',
    'next_scheduled_at = greatest(public.fiscal_sales_sync_state.next_scheduled_at, now()),' || chr(10) || '      updated_at = now();' || chr(10) || chr(10) || '    v_count');
  if position('extractor_manual_sync' in definition)=0 then raise exception 'Sync patch not applied'; end if;
  execute definition;
end;
$migration$;

