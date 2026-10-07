-- Separate independent external enumeration from cursor/sequence/inferred evidence.
-- "100%" may only be claimed when enumeration_complete=true with evidence_level=external_complete.

alter table public.fiscal_source_reconciliation
  add column if not exists evidence_level text not null default 'unconfirmed'
    check (evidence_level in ('external_complete','official_cursor','inferred','unconfirmed')),
  add column if not exists enumeration_complete boolean not null default false,
  add column if not exists external_source_count integer,
  add column if not exists evidence_scope text;

alter table public.fiscal_extractor_coverage
  add column if not exists evidence_level text not null default 'unconfirmed'
    check (evidence_level in ('external_complete','official_cursor','inferred','unconfirmed')),
  add column if not exists enumeration_complete boolean not null default false;

comment on column public.fiscal_source_reconciliation.evidence_level is
  'Strength of evidence: external_complete=independent exhaustive enumeration; official_cursor=official service caught up without independent item count; inferred=sequence/protocol inference; unconfirmed=no completeness proof.';
comment on column public.fiscal_source_reconciliation.enumeration_complete is
  'True only when an independent external source exhaustively enumerated the audited period/scope.';
comment on column public.fiscal_source_reconciliation.external_source_count is
  'Independent external item count. Never populated from the Extractor/site rows.';
comment on column public.fiscal_extractor_coverage.evidence_level is
  'Evidence strength propagated to coverage UI/health.';
comment on column public.fiscal_extractor_coverage.enumeration_complete is
  'Whether this coverage row has independently proven exhaustive enumeration.';

-- Existing rows are deliberately downgraded unless their provenance is clearly independent.
update public.fiscal_source_reconciliation
set
  evidence_level = case
    when source_name = 'SEFAZ/SP SAE-NFC-e' and source_confirmed = true then 'external_complete'
    when source_name like 'SEFAZ/AL relatório NF-e emitidas%' and source_confirmed = true then 'external_complete'
    when source_name like 'NFeDistribuicaoDFe%' and source_confirmed = true then 'official_cursor'
    when source_name like 'SVRS/SEFAZ NFC-e reconciliation%' then 'inferred'
    when source_name like 'SEFAZ/SP NF-e 55%' then 'inferred'
    else 'unconfirmed'
  end,
  enumeration_complete = case
    when source_name = 'SEFAZ/SP SAE-NFC-e' and source_confirmed = true then true
    when source_name like 'SEFAZ/AL relatório NF-e emitidas%' and source_confirmed = true then true
    else false
  end,
  external_source_count = case
    when source_name = 'SEFAZ/SP SAE-NFC-e' and source_confirmed = true then source_count
    when source_name like 'SEFAZ/AL relatório NF-e emitidas%' and source_confirmed = true then source_count
    else null
  end,
  evidence_scope = case
    when source_name = 'SEFAZ/SP SAE-NFC-e' then 'period'
    when source_name like 'SEFAZ/AL relatório NF-e emitidas%' then 'period'
    when source_name like 'NFeDistribuicaoDFe%' then 'service_cursor'
    when source_name like 'SVRS/SEFAZ NFC-e reconciliation%' then 'number_sequence'
    when source_name like 'SEFAZ/SP NF-e 55%' then 'observed_keys'
    else null
  end;

-- Never keep a legacy "official count" for evidence that is not independently exhaustive.
update public.fiscal_source_reconciliation
set source_count = null
where enumeration_complete = false;

with latest_reconciliation as (
  select distinct on (company_id, document_type)
    company_id,
    document_type,
    evidence_level,
    enumeration_complete
  from public.fiscal_source_reconciliation
  where document_type in ('purchase_nfe55','sale_nfe55','sale_nfce65')
  order by company_id, document_type, checked_at desc
),
mapped as (
  select
    company_id,
    case
      when document_type='purchase_nfe55' then 'nfe55'
      when document_type='sale_nfe55' then 'nfe55'
      when document_type='sale_nfce65' then 'nfce65'
    end as coverage_document_type,
    case when document_type='purchase_nfe55' then 'entrada' else 'saida' end as coverage_direction,
    evidence_level,
    enumeration_complete
  from latest_reconciliation
)
update public.fiscal_extractor_coverage c
set
  evidence_level = coalesce(m.evidence_level, 'unconfirmed'),
  enumeration_complete = coalesce(m.enumeration_complete, false)
from mapped m
where c.company_id=m.company_id
  and c.document_type=m.coverage_document_type
  and c.direction=m.coverage_direction;

-- Historical check rows may contain circular expected counts. Preserve history, but mark it.
update public.extractor_fiscal_check_runs
set details = jsonb_set(
  coalesce(details,'{}'::jsonb),
  '{legacy_evidence_warning}',
  'true'::jsonb,
  true
)
where checked_at < now()
  and (
    purchases_expected is not null
    or sales_expected is not null
  );
