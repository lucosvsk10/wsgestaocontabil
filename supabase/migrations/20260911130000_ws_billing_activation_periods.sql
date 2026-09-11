-- Activate exactly the purchased period without accidentally stacking a second month
-- when Mercado Pago sends subscription and payment notifications close together.
create or replace function public.activate_ws_paid_invoice(p_invoice_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_invoice public.saas_invoices%rowtype; v_sub public.saas_subscriptions%rowtype; v_start timestamptz; v_end timestamptz;
begin
  if current_user not in ('service_role','postgres','supabase_admin') then raise exception 'service role only'; end if;
  select * into v_invoice from public.saas_invoices where id=p_invoice_id and status='paid' for update;
  if not found or v_invoice.subscription_id is null then return; end if;
  select * into v_sub from public.saas_subscriptions where id=v_invoice.subscription_id for update;
  v_start := coalesce(v_invoice.paid_at,now());
  if v_sub.billing_mode='one_time' then
    v_end := v_start + interval '30 days';
  else
    v_end := greatest(coalesce(v_sub.current_period_end,v_start),v_start + interval '1 month');
  end if;
  update public.saas_subscriptions set status='active',current_period_start=v_start,
    current_period_end=v_end,access_expires_at=v_end where id=v_sub.id;
  perform public.sync_ws_subscription_access(v_sub.id,coalesce(v_sub.provider_subscription_id,''),'authorized',v_start,v_end);
end;
$$;
revoke all on function public.activate_ws_paid_invoice(uuid) from public,anon,authenticated;
grant execute on function public.activate_ws_paid_invoice(uuid) to service_role;
