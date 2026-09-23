-- Invalidate legacy AL NF-e 55 sales reconciliations produced before the
-- entry-report direction bug was fixed. Those rows could count purchase
-- documents as issuer sales and therefore cannot remain source-confirmed.
--
-- Fresh reconciliations may become confirmed again only from an exhaustive
-- issuer-sales source.

with affected as (
  select
    r.company_id,
    r.period_start,
    r.period_end,
    coalesce((
      select count(distinct s.access_key)
      from public.fiscal_sales_documents s
      where s.company_id = r.company_id
        and s.model = '55'
        and s.issue_date is not null
        and s.issue_date >= (r.period_start::timestamp at time zone 'America/Maceio')
        and s.issue_date < ((r.period_end + 1)::timestamp at time zone 'America/Maceio')
    ),0)::integer as actual_site_count
  from public.fiscal_source_reconciliation r
  join public.fiscal_companies c on c.id = r.company_id
  where c.uf = 'AL'
    and r.document_type = 'sale_nfe55'
    and r.source_confirmed = true
    and r.checked_at < timestamptz '2026-09-23 18:30:00+00'
    and r.source_name ilike 'SEFAZ/AL relatório NF-e emitidas%'
)
update public.fiscal_source_reconciliation r
set
  status = 'pending',
  source_confirmed = false,
  source_count = null,
  site_count = a.actual_site_count,
  missing_count = 0,
  extra_count = 0,
  reason = 'Reconciliação legada invalidada após correção do relatório de entrada da SEFAZ/AL; aguardando fonte oficial exaustiva de NF-e emitidas.',
  checked_at = now(),
  updated_at = now()
from affected a
where r.company_id = a.company_id
  and r.document_type = 'sale_nfe55'
  and r.period_start = a.period_start
  and r.period_end = a.period_end;
