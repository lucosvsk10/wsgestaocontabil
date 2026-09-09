create or replace function public.extractor_account_usage()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_account public.extractor_accounts%rowtype;
  v_used integer := 0;
  v_limit integer := 0;
  v_remaining integer := 0;
  v_percent integer := 0;
begin
  select ea.* into v_account
  from public.extractor_accounts ea
  where ea.status = 'active'
    and (private.is_extractor_member(ea.id, auth.uid()) or private.is_any_admin(auth.uid()))
  order by ea.created_at
  limit 1;

  if v_account.id is null then return null; end if;

  select count(fd.id)::integer into v_used
  from public.extractor_companies ec
  join public.fiscal_dfe_documents fd on fd.company_id = ec.fiscal_company_id
  where ec.account_id = v_account.id
    and ec.status = 'active'
    and fd.document_kind <> 'evento'
    and fd.full_xml = true
    and fd.xml is not null
    and fd.issue_date >= v_account.current_period_start
    and fd.issue_date < (v_account.current_period_start + interval '1 month');

  v_limit := greatest(coalesce(v_account.monthly_xml_limit, 0), 0);
  v_remaining := greatest(v_limit - v_used, 0);
  v_percent := case when v_limit > 0 then least(100, round((v_used::numeric / v_limit::numeric) * 100)::integer) else 0 end;

  return jsonb_build_object(
    'used', v_used,
    'limit', v_limit,
    'remaining', v_remaining,
    'percent', v_percent,
    'period_start', v_account.current_period_start,
    'period_end', (v_account.current_period_start + interval '1 month - 1 day')::date
  );
end;
$$;

grant execute on function public.extractor_account_usage() to authenticated;

update public.extractor_accounts ea
set name = 'WS teste', updated_at = now()
where exists (
  select 1
  from public.organization_members om
  join auth.users u on u.id = om.user_id
  where om.organization_id = ea.organization_id
    and om.status = 'active'
    and lower(u.email) = 'wsteste@gmail.com'
);
