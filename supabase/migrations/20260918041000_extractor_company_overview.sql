create or replace function public.extractor_company_overview(_company_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  v_account public.extractor_accounts%rowtype;
  v_allowed_from date;
  v_from_ts timestamptz;
  v_to_ts timestamptz;
  v_result jsonb;
begin
  if _company_id is null then
    raise exception 'extractor_company_required' using errcode='22023';
  end if;

  select ea.* into v_account
  from public.extractor_accounts ea
  join public.extractor_companies ec on ec.account_id=ea.id
  where ec.fiscal_company_id=_company_id
    and ec.status='active'
    and (
      private.is_extractor_member(ea.id,auth.uid())
      or private.is_any_admin(auth.uid())
    )
  order by
    case when private.is_extractor_member(ea.id,auth.uid()) then 0 else 1 end,
    ea.created_at
  limit 1;

  if v_account.id is null then
    raise exception 'extractor_company_access_denied' using errcode='42501';
  end if;

  v_allowed_from := public.extractor_effective_history_start(
    v_account.history_from,
    v_account.base_lookback_days
  );
  v_from_ts := (v_allowed_from::timestamp at time zone 'America/Sao_Paulo');
  v_to_ts := ((public.extractor_local_date()+1)::timestamp at time zone 'America/Sao_Paulo');

  with raw as (
    select
      coalesce(nullif(fd.access_key,''),'dfe:'||fd.id::text) identity_key,
      fd.direction,
      coalesce(nullif(fd.model,''),case when length(coalesce(fd.access_key,''))=44 then substr(fd.access_key,21,2) else '' end) model,
      fd.document_kind,
      fd.issue_date,
      coalesce(fd.value,0)::numeric value,
      (fd.full_xml=true and fd.xml is not null) full_xml,
      1 source_rank
    from public.fiscal_dfe_documents fd
    where fd.company_id=_company_id
      and fd.document_kind<>'evento'
      and fd.issue_date>=v_from_ts
      and fd.issue_date<v_to_ts

    union all

    select
      coalesce(nullif(sd.access_key,''),'sale:'||sd.id::text) identity_key,
      'saida'::text direction,
      coalesce(nullif(sd.model,''),case when length(coalesce(sd.access_key,''))=44 then substr(sd.access_key,21,2) else '' end) model,
      'nfe'::text document_kind,
      sd.issue_date,
      coalesce(sd.total_value,0)::numeric value,
      (sd.xml is not null) full_xml,
      0 source_rank
    from public.fiscal_sales_documents sd
    where sd.company_id=_company_id
      and sd.issue_date>=v_from_ts
      and sd.issue_date<v_to_ts
  ),
  docs as (
    select distinct on(identity_key)
      identity_key,direction,model,document_kind,issue_date,value,full_xml
    from raw
    order by identity_key,full_xml desc,source_rank asc,issue_date desc
  ),
  days as (
    select gs::date as calendar_day
    from generate_series(
      public.extractor_local_date()-29,
      public.extractor_local_date(),
      interval '1 day'
    ) gs
  )
  select jsonb_build_object(
    'allowed_from',v_allowed_from,
    'company_id',_company_id,
    'totals',jsonb_build_object(
      'documents',(select count(*)::integer from docs),
      'entries',(select count(*)::integer from docs where direction in ('entrada','inbound')),
      'exits',(select count(*)::integer from docs where direction in ('saida','outbound')),
      'value',(select coalesce(sum(value),0) from docs),
      'full_xml',(select count(*)::integer from docs where full_xml),
      'pending_xml',(select count(*)::integer from docs where not full_xml)
    ),
    'models',jsonb_build_object(
      'nfe',(select count(*)::integer from docs where model='55'),
      'nfce',(select count(*)::integer from docs where model='65'),
      'nfse',(select count(*)::integer from docs where lower(coalesce(document_kind,''))='nfse' or lower(coalesce(model,'')) in ('nfse','nfs-e')),
      'other',(select count(*)::integer from docs where coalesce(model,'') not in ('55','65') and lower(coalesce(document_kind,''))<>'nfse' and lower(coalesce(model,'')) not in ('nfse','nfs-e'))
    ),
    'daily',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'day',d.calendar_day,
        'documents',coalesce(x.documents,0)
      ) order by d.calendar_day),'[]'::jsonb)
      from days d
      left join (
        select
          (timezone('America/Sao_Paulo',issue_date))::date as calendar_day,
          count(*)::integer documents
        from docs
        where issue_date >= ((public.extractor_local_date()-29)::timestamp at time zone 'America/Sao_Paulo')
        group by 1
      ) x on x.calendar_day=d.calendar_day
    )
  ) into v_result;

  return v_result;
end;
$function$;

grant execute on function public.extractor_company_overview(uuid) to authenticated;
