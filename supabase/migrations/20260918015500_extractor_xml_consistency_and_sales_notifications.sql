-- Extractor fiscal consistency: propagate an available XML across duplicate rows,
-- count unique XML usage, and include both purchase and sales pipelines in import notifications.

create or replace function public.propagate_fiscal_full_xml()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.full_xml is true
     and new.xml is not null
     and length(new.xml) > 1000
     and nullif(new.access_key,'') is not null then
    update public.fiscal_dfe_documents d
    set
      full_xml = true,
      xml = new.xml,
      parse_error = null,
      schema_name = coalesce(new.schema_name,d.schema_name),
      document_kind = case when d.document_kind in ('resumo','documento') then new.document_kind else d.document_kind end,
      model = coalesce(new.model,d.model),
      issue_date = coalesce(new.issue_date,d.issue_date),
      value = case when coalesce(new.value,0)<>0 then new.value else d.value end,
      issuer_cnpj = coalesce(nullif(new.issuer_cnpj,''),d.issuer_cnpj),
      issuer_name = coalesce(nullif(new.issuer_name,''),d.issuer_name),
      recipient_cnpj = coalesce(nullif(new.recipient_cnpj,''),d.recipient_cnpj),
      note_number = coalesce(nullif(new.note_number,''),d.note_number),
      series = coalesce(nullif(new.series,''),d.series),
      status_code = coalesce(nullif(new.status_code,''),d.status_code),
      status_text = coalesce(nullif(new.status_text,''),d.status_text),
      updated_at = now()
    where d.company_id=new.company_id
      and d.access_key=new.access_key
      and d.id<>new.id
      and (d.full_xml is not true or d.xml is null or length(d.xml)<=1000);
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_propagate_fiscal_full_xml on public.fiscal_dfe_documents;
create trigger trg_propagate_fiscal_full_xml
after insert or update of full_xml,xml
on public.fiscal_dfe_documents
for each row
when (new.full_xml is true and new.xml is not null)
execute function public.propagate_fiscal_full_xml();

-- Repair existing mixed duplicate keys, including documents that were already
-- complete in the ADM but still had a stale summary row in the Extractor.
with best as (
  select distinct on (company_id,access_key)
    company_id,access_key,xml,schema_name,document_kind,model,issue_date,value,
    issuer_cnpj,issuer_name,recipient_cnpj,note_number,series,status_code,status_text
  from public.fiscal_dfe_documents
  where access_key is not null
    and full_xml=true
    and xml is not null
    and length(xml)>1000
  order by company_id,access_key,updated_at desc
)
update public.fiscal_dfe_documents d
set
  full_xml=true,
  xml=best.xml,
  parse_error=null,
  schema_name=coalesce(best.schema_name,d.schema_name),
  document_kind=case when d.document_kind in ('resumo','documento') then best.document_kind else d.document_kind end,
  model=coalesce(best.model,d.model),
  issue_date=coalesce(best.issue_date,d.issue_date),
  value=case when coalesce(best.value,0)<>0 then best.value else d.value end,
  issuer_cnpj=coalesce(nullif(best.issuer_cnpj,''),d.issuer_cnpj),
  issuer_name=coalesce(nullif(best.issuer_name,''),d.issuer_name),
  recipient_cnpj=coalesce(nullif(best.recipient_cnpj,''),d.recipient_cnpj),
  note_number=coalesce(nullif(best.note_number,''),d.note_number),
  series=coalesce(nullif(best.series,''),d.series),
  status_code=coalesce(nullif(best.status_code,''),d.status_code),
  status_text=coalesce(nullif(best.status_text,''),d.status_text),
  updated_at=now()
from best
where d.company_id=best.company_id
  and d.access_key=best.access_key
  and (d.full_xml is not true or d.xml is null or length(d.xml)<=1000);

create or replace function public.extractor_account_usage()
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
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

  select count(*)::integer into v_used
  from (
    select distinct
      ec.id as extractor_company_id,
      coalesce(nullif(fd.access_key,''),fd.id::text) as document_identity
    from public.extractor_companies ec
    join public.fiscal_dfe_documents fd on fd.company_id = ec.fiscal_company_id
    where ec.account_id = v_account.id
      and ec.status = 'active'
      and fd.document_kind <> 'evento'
      and fd.full_xml = true
      and fd.xml is not null
      and fd.issue_date >= v_account.current_period_start
      and fd.issue_date < (v_account.current_period_start + interval '1 month')
  ) unique_documents;

  v_limit := greatest(coalesce(v_account.monthly_xml_limit, 0), 0);
  v_remaining := greatest(v_limit - v_used, 0);
  v_percent := case
    when v_limit > 0 then least(100, round((v_used::numeric / v_limit::numeric) * 100)::integer)
    else 0
  end;

  return jsonb_build_object(
    'used', v_used,
    'limit', v_limit,
    'remaining', v_remaining,
    'percent', v_percent,
    'period_start', v_account.current_period_start,
    'period_end', (v_account.current_period_start + interval '1 month - 1 day')::date
  );
end;
$function$;

create or replace function public.scan_extractor_import_notifications()
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  r record;
  v_last timestamptz;
  v_now timestamptz := now();
  v_purchases integer := 0;
  v_sales integer := 0;
  v_total integer := 0;
  v_keys text[] := '{}';
  v_issue_from timestamptz;
  v_issue_to timestamptz;
  v_created integer := 0;
  v_title text;
  v_message text;
begin
  for r in
    select
      ea.id account_id,
      ec.fiscal_company_id company_id,
      coalesce(nullif(ec.profile_overrides->>'trade_name',''),fc.nome_fantasia,fc.razao_social) company_name
    from public.extractor_accounts ea
    join public.extractor_companies ec on ec.account_id=ea.id
    join public.fiscal_companies fc on fc.id=ec.fiscal_company_id
    where ea.status in ('trialing','active','past_due')
      and ec.status='active'
      and coalesce(ec.automatic_sync,true)=true
  loop
    insert into public.extractor_notification_scan_state(account_id,company_id,last_scanned_at,updated_at)
    values(r.account_id,r.company_id,v_now,v_now)
    on conflict(account_id,company_id) do nothing;

    select last_scanned_at into v_last
    from public.extractor_notification_scan_state
    where account_id=r.account_id and company_id=r.company_id
    for update;

    with new_purchases as (
      select distinct on (coalesce(nullif(fd.access_key,''),fd.id::text))
        coalesce(nullif(fd.access_key,''),fd.id::text) identity_key,
        nullif(fd.access_key,'') access_key,
        fd.issue_date
      from public.fiscal_dfe_documents fd
      where fd.company_id=r.company_id
        and fd.document_kind<>'evento'
        and fd.direction in ('entrada','inbound')
        and fd.created_at>v_last
        and fd.created_at<=v_now
      order by coalesce(nullif(fd.access_key,''),fd.id::text),fd.full_xml desc,fd.updated_at desc
    ),
    new_sales as (
      select distinct on (coalesce(nullif(sd.access_key,''),sd.id::text))
        coalesce(nullif(sd.access_key,''),sd.id::text) identity_key,
        nullif(sd.access_key,'') access_key,
        sd.issue_date
      from public.fiscal_sales_documents sd
      where sd.company_id=r.company_id
        and coalesce(sd.first_seen_at,sd.updated_at)>v_last
        and coalesce(sd.first_seen_at,sd.updated_at)<=v_now
      order by coalesce(nullif(sd.access_key,''),sd.id::text),sd.updated_at desc
    ),
    all_rows as (
      select 'purchase'::text kind,identity_key,access_key,issue_date from new_purchases
      union all
      select 'sale'::text kind,identity_key,access_key,issue_date from new_sales
    )
    select
      count(*) filter(where kind='purchase')::integer,
      count(*) filter(where kind='sale')::integer,
      count(*)::integer,
      coalesce(array_agg(access_key order by issue_date desc) filter(where access_key is not null),'{}'::text[]),
      min(issue_date),
      max(issue_date)
    into v_purchases,v_sales,v_total,v_keys,v_issue_from,v_issue_to
    from all_rows;

    if coalesce(v_total,0)>0 then
      v_title := case
        when v_purchases>0 and v_sales>0 then 'Novos documentos importados'
        when v_purchases>0 then 'Novas compras importadas'
        else 'Novas vendas importadas'
      end;
      v_message := concat_ws(' · ',
        case when v_purchases>0 then format('%s compra(s)',v_purchases) end,
        case when v_sales>0 then format('%s venda(s)',v_sales) end
      );

      insert into public.extractor_import_notifications(account_id,company_id,kind,title,message,metadata)
      values(
        r.account_id,
        r.company_id,
        'fiscal_import',
        v_title,
        v_message,
        jsonb_build_object(
          'company_name',r.company_name,
          'purchase_count',v_purchases,
          'sales_count',v_sales,
          'total_count',v_total,
          'access_keys',to_jsonb(v_keys[1:100]),
          'issue_from',v_issue_from,
          'issue_to',v_issue_to,
          'scanned_from',v_last,
          'scanned_to',v_now
        )
      );
      v_created := v_created + 1;
    end if;

    update public.extractor_notification_scan_state
    set last_scanned_at=v_now,updated_at=v_now
    where account_id=r.account_id and company_id=r.company_id;
  end loop;

  return v_created;
end;
$function$;

revoke all on function public.scan_extractor_import_notifications() from public,anon,authenticated;
grant execute on function public.scan_extractor_import_notifications() to service_role;
