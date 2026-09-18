-- Make the calendar-history rule durable for future company links and manual syncs.

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

  select * into v_rate
  from public.consume_rate_limit(
    'extractor_manual_sync',
    auth.uid()::text || '|' || v_account.id::text,
    3,
    300
  );
  if not v_rate.allowed then
    return jsonb_build_object(
      'ok',false,
      'code','RATE_LIMITED',
      'message','Aguarde antes de solicitar outra sincronização.',
      'retry_after_seconds',v_rate.retry_after_seconds
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
        when public.fiscal_purchase_sync_state.status in ('running','queued') then public.fiscal_purchase_sync_state.status
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
        when exists (
          select 1
          from public.fiscal_state_credentials cred
          where cred.company_id=v_company and cred.uf='AL' and cred.is_active=true
        ) then 'queued'
        else 'waiting_state_credentials'
      end,
      next_scheduled_at = now(),
      last_error = case
        when exists (
          select 1
          from public.fiscal_state_credentials cred
          where cred.company_id=v_company and cred.uf='AL' and cred.is_active=true
        ) then null
        else public.fiscal_sales_sync_state.last_error
      end,
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
    'minimum_history_from', v_history_start
  );
end;
$function$;

create or replace function public.extractor_save_verified_certificate(
  p_account_id uuid,
  p_actor_id uuid,
  p_company jsonb,
  p_certificate jsonb
)
returns uuid
language plpgsql
set search_path to ''
as $function$
declare
  v_company public.fiscal_companies%rowtype;
  v_cnpj text := p_company->>'cnpj';
  v_org_id uuid;
  v_existing_certificate_id uuid;
  v_cross_account boolean := false;
  v_serial text := nullif(p_certificate->>'serial_number','');
  v_history_start date := public.extractor_minimum_history_start();
  v_history_month text := to_char(public.extractor_minimum_history_start(),'YYMM');
  v_history_days integer := (current_date-public.extractor_minimum_history_start())::integer;
begin
  if not private.can_manage_extractor(p_account_id,p_actor_id) then
    raise exception 'extractor_access_denied' using errcode='42501';
  end if;

  select organization_id into v_org_id
  from public.extractor_accounts
  where id=p_account_id
  for share;

  if v_org_id is null then
    raise exception 'extractor_account_not_found' using errcode='22023';
  end if;

  if v_cnpj !~ '^[0-9]{14}$'
    or p_certificate->>'holder_cnpj' is distinct from v_cnpj
    or (p_certificate->>'valid_until')::date < current_date
    or nullif(p_certificate->>'certificate_ciphertext','') is null
    or nullif(p_certificate->>'password_ciphertext','') is null then
    raise exception 'invalid_certificate' using errcode='22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('extractor_certificate:'||v_cnpj,0));

  select * into v_company
  from public.fiscal_companies
  where cnpj=v_cnpj
  for update;

  if v_company.id is null then
    insert into public.fiscal_companies(
      cnpj,razao_social,nome_fantasia,inscricao_estadual,endereco,uf,codigo_municipio,
      municipio,regime_tributario,ambiente_padrao,status,created_by,fiscal_settings
    )
    values(
      v_cnpj,p_company->>'razao_social',p_company->>'nome_fantasia',
      p_company->>'inscricao_estadual',p_company->'endereco',p_company->>'uf',
      p_company->>'codigo_municipio',p_company->>'municipio',
      p_company->>'regime_tributario','producao','ativa',p_actor_id,
      coalesce(p_company->'fiscal_settings','{}'::jsonb)
    )
    returning * into v_company;
  else
    select exists(
      select 1
      from public.extractor_companies ec
      where ec.fiscal_company_id=v_company.id
        and ec.account_id<>p_account_id
        and ec.status<>'removed'
    ) into v_cross_account;
  end if;

  update public.fiscal_companies
  set fiscal_settings =
    coalesce(fiscal_settings,'{}'::jsonb)
    || coalesce(p_company->'fiscal_settings','{}'::jsonb)
    || jsonb_build_object(
      'history_window_mode','previous_full_month_plus_current',
      'history_start_date',
        least(
          case
            when coalesce(fiscal_settings->>'history_start_date','') ~ '^\d{4}-\d{2}-\d{2}$'
              then (fiscal_settings->>'history_start_date')::date
            else v_history_start
          end,
          v_history_start
        )::text,
      'history_window_refreshed_at',now()
    ),
    updated_at=now()
  where id=v_company.id
  returning * into v_company;

  if v_serial is not null then
    select id into v_existing_certificate_id
    from public.fiscal_certificates
    where company_id=v_company.id
      and serial_number=v_serial
      and holder_cnpj=v_cnpj
      and valid_until>=current_date
    order by is_active desc, valid_until desc
    limit 1
    for update;
  end if;

  if v_existing_certificate_id is not null then
    update public.fiscal_certificates
    set certificate_name=coalesce(nullif(p_certificate->>'certificate_name',''),certificate_name),
        certificate_ciphertext=p_certificate->>'certificate_ciphertext',
        certificate_iv=p_certificate->>'certificate_iv',
        password_ciphertext=p_certificate->>'password_ciphertext',
        password_iv=p_certificate->>'password_iv',
        holder_name=coalesce(nullif(p_certificate->>'holder_name',''),holder_name),
        valid_from=(p_certificate->>'valid_from')::date,
        valid_until=(p_certificate->>'valid_until')::date,
        is_active=true,
        inspected_at=now(),
        updated_at=now()
    where id=v_existing_certificate_id;
  else
    update public.fiscal_certificates
    set is_active=false,updated_at=now()
    where company_id=v_company.id and is_active;

    insert into public.fiscal_certificates(
      company_id,certificate_name,certificate_ciphertext,certificate_iv,
      password_ciphertext,password_iv,holder_cnpj,holder_name,valid_from,valid_until,
      serial_number,is_active,inspected_at,created_by
    )
    values(
      v_company.id,p_certificate->>'certificate_name',
      p_certificate->>'certificate_ciphertext',p_certificate->>'certificate_iv',
      p_certificate->>'password_ciphertext',p_certificate->>'password_iv',
      v_cnpj,p_certificate->>'holder_name',
      (p_certificate->>'valid_from')::date,(p_certificate->>'valid_until')::date,
      v_serial,true,now(),p_actor_id
    );
  end if;

  insert into public.extractor_companies(account_id,fiscal_company_id,status,automatic_sync)
  values(p_account_id,v_company.id,'active',true)
  on conflict(account_id,fiscal_company_id)
  do update set status='active',automatic_sync=true,updated_at=now();

  insert into public.fiscal_purchase_sync_state(company_id,paused,status,next_scheduled_at)
  values(v_company.id,false,'queued',now())
  on conflict(company_id) do update set
    paused=false,
    status=case
      when public.fiscal_purchase_sync_state.status='running' then 'running'
      else 'queued'
    end,
    next_scheduled_at=now(),
    updated_at=now();

  insert into public.fiscal_sales_sync_state(
    company_id,paused,status,backfill_days,initial_backfill_done,
    reconciliation_complete,history_start_month,next_scheduled_at
  )
  values(
    v_company.id,false,'queued',v_history_days,false,false,
    v_history_month,now()
  )
  on conflict(company_id) do update set
    paused=false,
    backfill_days=greatest(coalesce(public.fiscal_sales_sync_state.backfill_days,0),v_history_days),
    history_start_month=case
      when public.fiscal_sales_sync_state.history_start_month is null
        or public.fiscal_sales_sync_state.history_start_month>v_history_month
      then v_history_month
      else public.fiscal_sales_sync_state.history_start_month
    end,
    initial_backfill_done=case
      when public.fiscal_sales_sync_state.history_start_month is null
        or public.fiscal_sales_sync_state.history_start_month>v_history_month
      then false
      else public.fiscal_sales_sync_state.initial_backfill_done
    end,
    reconciliation_complete=case
      when public.fiscal_sales_sync_state.history_start_month is null
        or public.fiscal_sales_sync_state.history_start_month>v_history_month
      then false
      else public.fiscal_sales_sync_state.reconciliation_complete
    end,
    status=case
      when public.fiscal_sales_sync_state.status in ('running','reconciling','bootstrap_window') then public.fiscal_sales_sync_state.status
      when exists(
        select 1 from public.fiscal_state_credentials cred
        where cred.company_id=v_company.id and cred.uf='AL' and cred.is_active=true
      ) then 'queued'
      else 'waiting_state_credentials'
    end,
    next_scheduled_at=now(),
    updated_at=now();

  insert into public.saas_audit_logs(
    organization_id,actor_user_id,action,resource_type,resource_id,is_sensitive,metadata
  )
  values(
    v_org_id,p_actor_id,
    case when v_cross_account then 'extractor_company_linked_verified_certificate'
         else 'extractor_certificate_saved' end,
    'fiscal_company',v_company.id::text,true,
    jsonb_build_object(
      'cnpj_suffix',right(v_cnpj,4),
      'cross_account_existing_company',v_cross_account,
      'serial_present',v_serial is not null,
      'minimum_history_from',v_history_start
    )
  );

  return v_company.id;
end;
$function$;
