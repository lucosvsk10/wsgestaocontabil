-- When an A1 becomes active/valid for a company already linked to the Extrator,
-- clear stale "waiting_certificate" states and queue a new fiscal pass.
-- Certificate persistence must never fail because the queue could not be started.

create or replace function public.requeue_extractor_after_a1_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_has_extractor boolean;
  v_uf text;
  v_has_state_credential boolean;
  v_history_start date;
  v_period_to date;
  v_days integer;
  v_month text;
  v_now timestamptz := now();
begin
  if not coalesce(new.is_active, false)
     or new.valid_until is null
     or new.valid_until < current_date
     or (new.valid_from is not null and new.valid_from > current_date) then
    return new;
  end if;

  select exists (
    select 1
    from public.extractor_companies ec
    where ec.fiscal_company_id = new.company_id
      and ec.status = 'active'
  )
  into v_has_extractor;

  if not v_has_extractor then
    return new;
  end if;

  begin
    select upper(coalesce(fc.uf,'')) into v_uf
    from public.fiscal_companies fc
    where fc.id = new.company_id;

    select exists (
      select 1
      from public.fiscal_state_credentials cred
      where cred.company_id = new.company_id
        and cred.uf = 'AL'
        and cred.is_active = true
    )
    into v_has_state_credential;

    v_history_start := public.extractor_minimum_history_start();
    v_period_to := current_date;
    v_days := greatest(1, (v_period_to - v_history_start)::integer);
    v_month := to_char(v_history_start, 'YYMM');

    update public.fiscal_companies
    set fiscal_settings =
      coalesce(fiscal_settings,'{}'::jsonb)
      || jsonb_build_object(
        'history_window_mode','previous_full_month_plus_current',
        'history_start_date',v_history_start::text,
        'history_window_refreshed_at',v_now,
        'extractor_initial_sync',jsonb_build_object(
          'queued_at',v_now,
          'period_from',v_history_start::text,
          'period_to',v_period_to::text,
          'reason','certificate_activated'
        )
      ),
      updated_at = v_now
    where id = new.company_id;

    insert into public.fiscal_purchase_sync_state(
      company_id, paused, status, consecutive_failures,
      last_error, next_scheduled_at, updated_at
    )
    values (
      new.company_id, false, 'queued', 0,
      null, v_now, v_now
    )
    on conflict (company_id) do update set
      paused = false,
      status = case
        when public.fiscal_purchase_sync_state.status = 'running'
          then 'running'
        else 'queued'
      end,
      consecutive_failures = 0,
      last_error = null,
      next_scheduled_at = v_now,
      updated_at = v_now;

    insert into public.fiscal_sales_sync_state(
      company_id, paused, status, backfill_days,
      initial_backfill_done, reconciliation_complete,
      history_start_month, last_error, next_scheduled_at, updated_at
    )
    values (
      new.company_id,
      false,
      case when v_uf = 'AL' and not v_has_state_credential
        then 'waiting_state_credentials'
        else 'queued'
      end,
      v_days,
      false,
      false,
      v_month,
      null,
      v_now,
      v_now
    )
    on conflict (company_id) do update set
      paused = false,
      status = case
        when public.fiscal_sales_sync_state.status in ('running','reconciling','bootstrap_window')
          then public.fiscal_sales_sync_state.status
        when v_uf = 'AL' and not v_has_state_credential
          then 'waiting_state_credentials'
        else 'queued'
      end,
      backfill_days = greatest(coalesce(public.fiscal_sales_sync_state.backfill_days,0), v_days),
      initial_backfill_done = false,
      reconciliation_complete = false,
      history_start_month = v_month,
      last_error = null,
      next_scheduled_at = v_now,
      updated_at = v_now;

    begin
      perform public.trigger_fiscal_purchases_cron();
    exception when others then
      null;
    end;

    begin
      perform public.trigger_fiscal_sales_cron();
    exception when others then
      null;
    end;
  exception when others then
    -- Never roll back a valid A1 because a secondary sync-state update failed.
    null;
  end;

  return new;
end;
$$;

drop trigger if exists trg_requeue_extractor_after_a1_change
  on public.fiscal_certificates;

create trigger trg_requeue_extractor_after_a1_change
after insert or update of is_active, valid_from, valid_until
on public.fiscal_certificates
for each row
execute function public.requeue_extractor_after_a1_change();
