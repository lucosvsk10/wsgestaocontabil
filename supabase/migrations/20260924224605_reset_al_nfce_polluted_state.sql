-- A model 55 note must never seed the model 65 sequence. Reset only AL companies
-- that have no official NFC-e key/document/event, preserving every confirmed row.
with affected as (
  select fc.id
  from public.fiscal_companies fc
  join public.fiscal_sales_sync_state ss on ss.company_id=fc.id
  where upper(coalesce(fc.uf,''))='AL'
    and not exists (
      select 1
      from public.fiscal_sales_documents sd
      where sd.company_id=fc.id
        and sd.model='65'
        and sd.access_key ~ '^[0-9]{44}$'
    )
    and not exists (
      select 1
      from public.fiscal_dfe_documents fd
      where fd.company_id=fc.id
        and fd.direction='saida'
        and fd.model='65'
        and fd.access_key ~ '^[0-9]{44}$'
    )
    and not exists (
      select 1
      from public.fiscal_dfe_events fe
      where fe.company_id=fc.id
        and fe.access_key ~ '^[0-9]{44}$'
        and substring(fe.access_key from 21 for 2)='65'
        and substring(fe.access_key from 7 for 14)=regexp_replace(fc.cnpj,'\D','','g')
    )
)
update public.fiscal_sales_sync_state ss
set latest_number=0,
    cursor_number=0,
    initial_floor_number=0,
    reconciliation_complete=false,
    initial_backfill_done=false,
    status='queued',
    last_error='Reiniciando descoberta NFC-e pela fonte oficial estadual; referência anterior pertencia a outro modelo.',
    next_scheduled_at=now(),
    updated_at=now()
from affected a
where ss.company_id=a.id;

select public.trigger_fiscal_sales_cron();
