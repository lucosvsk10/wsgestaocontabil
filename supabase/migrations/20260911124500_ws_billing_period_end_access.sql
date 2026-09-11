-- Keep access through the already-paid period when automatic renewal is cancelled.
create or replace function public.sync_ws_subscription_access(
  p_subscription_id uuid,
  p_provider_subscription_id text,
  p_provider_status text,
  p_period_start timestamptz,
  p_period_end timestamptz
) returns void
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_sub public.saas_subscriptions%rowtype; v_status text; v_limit integer; v_cancel_at_end boolean := false;
begin
  if current_user not in ('service_role','postgres','supabase_admin') then raise exception 'service role only'; end if;
  select * into v_sub from public.saas_subscriptions where id = p_subscription_id for update;
  if not found then return; end if;
  v_status := case
    when lower(p_provider_status) = 'authorized' and v_sub.trial_ends_at > now() then 'trialing'
    when lower(p_provider_status) = 'authorized' then 'active'
    when lower(p_provider_status) in ('cancelled','canceled') and coalesce(p_period_end,v_sub.access_expires_at) > now() then 'active'
    when lower(p_provider_status) in ('cancelled','canceled') then 'canceled'
    when lower(p_provider_status) = 'paused' then 'paused'
    else 'incomplete' end;
  v_cancel_at_end := lower(p_provider_status) in ('cancelled','canceled') and v_status='active';
  update public.saas_subscriptions set
    provider='mercado_pago', provider_subscription_id=coalesce(nullif(p_provider_subscription_id,''),provider_subscription_id),
    provider_status=left(p_provider_status,60), status=v_status, cancel_at_period_end=v_cancel_at_end,
    current_period_start=coalesce(p_period_start,current_period_start),
    current_period_end=coalesce(p_period_end,current_period_end),
    access_expires_at=case when v_status in ('trialing','active') then coalesce(p_period_end,trial_ends_at,access_expires_at) else access_expires_at end
  where id=p_subscription_id;
  if v_sub.product_code='extractor' then
    select coalesce((limits->>'monthly_xml')::integer,10000000) into v_limit from public.saas_plans where id=v_sub.plan_id;
    insert into public.extractor_accounts(organization_id,name,status,plan_code,monthly_xml_limit,base_lookback_days,current_period_start,access_source,access_expires_at,lifetime_access)
    select v_sub.organization_id,o.name,case when v_status in ('trialing','active') then 'active' else 'suspended' end,p.code,v_limit,30,
      coalesce(p_period_start,now())::date,'billing',coalesce(p_period_end,v_sub.trial_ends_at,v_sub.access_expires_at),false
    from public.organizations o join public.saas_plans p on p.id=v_sub.plan_id where o.id=v_sub.organization_id
    on conflict (organization_id) do update set status=excluded.status,plan_code=excluded.plan_code,
      monthly_xml_limit=excluded.monthly_xml_limit,current_period_start=excluded.current_period_start,
      access_source='billing',access_expires_at=excluded.access_expires_at,lifetime_access=false,updated_at=now();
  end if;
end;
$$;
revoke all on function public.sync_ws_subscription_access(uuid,text,text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.sync_ws_subscription_access(uuid,text,text,timestamptz,timestamptz) to service_role;
