-- Server-only access context: preserve administrator access; match the paid feed's account/window.
create or replace function public.extractor_document_access(p_user_id uuid, p_company_id uuid)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v_account public.extractor_accounts%rowtype;
begin
  if p_user_id is null or p_company_id is null then return jsonb_build_object('allowed',false); end if;
  if private.is_any_admin(p_user_id) then return jsonb_build_object('allowed',true,'from',null,'to',current_date); end if;
  select ea.* into v_account
  from public.extractor_accounts ea join public.extractor_companies ec on ec.account_id=ea.id
  where ec.fiscal_company_id=p_company_id and ec.status='active' and private.is_extractor_member(ea.id,p_user_id)
  order by ea.created_at limit 1;
  if v_account.id is null then return jsonb_build_object('allowed',false); end if;
  return jsonb_build_object('allowed',true,'from',greatest(coalesce(v_account.history_from,current_date-v_account.base_lookback_days),current_date-366),'to',current_date);
end;
$$;
revoke all on function public.extractor_document_access(uuid,uuid) from public, anon, authenticated;
grant execute on function public.extractor_document_access(uuid,uuid) to service_role;
