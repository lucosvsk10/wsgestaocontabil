-- Extrator: keep the manual correction safe for government endpoints.
-- One manual fiscal refresh per Extrator account every five minutes prevents users,
-- tabs or different companies from starting overlapping global fiscal workers.

create or replace function public.extractor_queue_sync(_company_id uuid default null::uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_account public.extractor_accounts%rowtype;
  v_company uuid;
  v_count integer := 0;
  v_rate record;
  v_history_start date := public.extractor_minimum_history_start();
  v_month text := to_char(public.extractor_minimum_history_start(), 'YYMM');
  v_days integer := (current_date - public.extractor_minimum_history_start())::integer;
  v_rate_key text;
begin
  select ea.* into v_account
  from public.extractor_accounts ea
  where ea.status in ('trialing','active','past_due')
    and private.can_manage_extractor(ea.id, auth.uid())
  order by
    case when private.is_extractor_member(ea.id, auth.uid()) then 0 else 1 end,
    ea.created_at
  limit 1;

  if v_account.id is null then
    raise exception 'extractor_access_denied' using errcode = '42501';
  end if;

  v_rate_key :=
    auth.uid()::text || '|' ||
    v_account.id::text;

  select * into v_rate
  from public.consume_rate_limit(
    'extractor_manual_sync_account',
    v_rate_key,
    1,
    300
  );

  if not v_rate.allowed then
    return jsonb_build_object(
      'ok', false,
      'code', 'RATE_LIMITED',
      'message', 'Aguarde alguns minutos antes de solicitar outra busca para esta empresa.',
      'retry_after_seconds', v_rate.retry_after_seconds
    );
  end if;

  for v_company in
    select ec.fiscal_company_id
    from public.extractor_companies ec
    where ec.account_id = v_account.id
      and ec.status = 'active'
      and (_company_id is null or ec.fiscal_company_id = _company_id)
  loop
    update public.fiscal_companies fc
    set fiscal_settings =
      coalesce(fc.fiscal_settings,'{}'::jsonb)
      || jsonb_build_object(
        'history_window_mode','previous_full_month_plus_current',
        'history_start_date',
          least(
            case
              when coalesce(fc.fiscal_settings->>'history_start_date','') ~ '^\d{4}-\d{2}-\d{2}$'
                then (fc.fiscal_settings->>'history_start_date')::date
              else v_history_start
            end,
            v_history_start
          )::text,
        'history_window_refreshed_at',now()
      ),
      updated_at=now()
    where fc.id=v_company;

    insert into public.fiscal_purchase_sync_state(
      company_id, paused, status, consecutive_failures, last_error, next_scheduled_at, updated_at
    )
    values (v_company, false, 'queued', 0, null, now(), now())
    on conflict (company_id) do update set
      paused = false,
      status = case
        when public.fiscal_purchase_sync_state.status in ('running','queued')
          then public.fiscal_purchase_sync_state.status
        else 'queued'
      end,
      next_scheduled_at = now(),
      last_error = null,
      updated_at = now();

    insert into public.fiscal_sales_sync_state(
      company_id, paused, status, backfill_days, initial_backfill_done,
      reconciliation_complete, history_start_month, last_error, next_scheduled_at, updated_at
    )
    values (
      v_company, false, 'queued', v_days, false, false, v_month, null, now(), now()
    )
    on conflict (company_id) do update set
      paused = false,
      backfill_days = greatest(coalesce(public.fiscal_sales_sync_state.backfill_days,0), v_days),
      history_start_month = case
        when public.fiscal_sales_sync_state.history_start_month is null
          or public.fiscal_sales_sync_state.history_start_month > v_month
        then v_month
        else public.fiscal_sales_sync_state.history_start_month
      end,
      initial_backfill_done = case
        when public.fiscal_sales_sync_state.history_start_month is null
          or public.fiscal_sales_sync_state.history_start_month > v_month
        then false
        else public.fiscal_sales_sync_state.initial_backfill_done
      end,
      reconciliation_complete = case
        when public.fiscal_sales_sync_state.history_start_month is null
          or public.fiscal_sales_sync_state.history_start_month > v_month
        then false
        else public.fiscal_sales_sync_state.reconciliation_complete
      end,
      status = case
        when public.fiscal_sales_sync_state.status in ('running','queued','reconciling','bootstrap_window')
          then public.fiscal_sales_sync_state.status
        else 'queued'
      end,
      next_scheduled_at = now(),
      last_error = null,
      updated_at = now();

    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    return jsonb_build_object('ok', false, 'code', 'NO_COMPANY', 'queued', 0);
  end if;

  perform public.trigger_fiscal_purchases_cron();
  perform public.trigger_fiscal_sales_cron();

  return jsonb_build_object(
    'ok', true,
    'queued', v_count,
    'queued_at', now(),
    'cooldown_seconds', 300,
    'minimum_history_from', v_history_start
  );
end;
$function$;
