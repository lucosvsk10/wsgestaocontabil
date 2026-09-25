alter table public.fiscal_sales_sync_state
  add column if not exists reference_access_key text,
  add column if not exists reference_model text,
  add column if not exists reference_series text,
  add column if not exists reference_number bigint,
  add column if not exists reference_method text,
  add column if not exists reference_submitted_at timestamptz,
  add column if not exists reference_submitted_by uuid references auth.users(id) on delete set null;

comment on column public.fiscal_sales_sync_state.reference_access_key is
  'Validated issuer access key used only to bootstrap automatic sales discovery.';
comment on column public.fiscal_sales_sync_state.reference_method is
  'How the bootstrap reference was supplied: key, XML, DANFE or QR code.';

insert into public.fiscal_sales_sync_state (company_id,status,next_scheduled_at,updated_at)
select distinct ec.fiscal_company_id,'queued',now(),now()
from public.extractor_companies ec
join public.fiscal_companies fc on fc.id=ec.fiscal_company_id
where ec.status='active'
  and fc.status='ativa'
  and ec.fiscal_company_id is not null
on conflict (company_id) do nothing;

with latest_reference as (
  select distinct on (sd.company_id)
    sd.company_id,
    sd.access_key,
    substring(sd.access_key from 21 for 2) as model,
    trim(leading '0' from substring(sd.access_key from 23 for 3)) as series,
    substring(sd.access_key from 26 for 9)::bigint as note_number,
    sd.updated_at
  from public.fiscal_sales_documents sd
  join public.fiscal_companies fc on fc.id=sd.company_id
  join public.extractor_companies ec
    on ec.fiscal_company_id=sd.company_id
   and ec.status='active'
  where sd.access_key ~ '^[0-9]{44}$'
    and substring(sd.access_key from 7 for 14)=regexp_replace(fc.cnpj,'\D','','g')
    and substring(sd.access_key from 21 for 2) in ('55','65')
  order by sd.company_id,sd.issue_date desc nulls last,sd.updated_at desc
)
update public.fiscal_sales_sync_state ss
set reference_access_key=coalesce(ss.reference_access_key,lr.access_key),
    reference_model=coalesce(ss.reference_model,lr.model),
    reference_series=coalesce(ss.reference_series,nullif(lr.series,''),'0'),
    reference_number=coalesce(ss.reference_number,lr.note_number),
    reference_method=coalesce(ss.reference_method,'existing_document'),
    reference_submitted_at=coalesce(ss.reference_submitted_at,lr.updated_at,now()),
    latest_number=greatest(coalesce(ss.latest_number,0),lr.note_number),
    cursor_number=greatest(coalesce(ss.cursor_number,0),lr.note_number),
    updated_at=now()
from latest_reference lr
where ss.company_id=lr.company_id;

update public.fiscal_sales_sync_state ss
set status=case
      when coalesce(ss.paused,false) then ss.status
      when ss.status in ('running','reconciling','bootstrap_window') then ss.status
      else 'queued'
    end,
    next_scheduled_at=case when coalesce(ss.paused,false) then ss.next_scheduled_at else now() end,
    reconciliation_complete=case when coalesce(ss.paused,false) then ss.reconciliation_complete else false end,
    updated_at=now()
where exists (
  select 1
  from public.extractor_companies ec
  join public.fiscal_companies fc on fc.id=ec.fiscal_company_id
  where ec.fiscal_company_id=ss.company_id
    and ec.status='active'
    and fc.status='ativa'
);
