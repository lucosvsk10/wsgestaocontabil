-- SEFAZ/AL endpoint /relatorios/notas-fiscais-entrada contains documents
-- that are entries relative to the queried company. The sheet's "Tipo"
-- column is NF-e tpNF from the issuer perspective and must not be used as
-- the company's purchase/sale direction.

update public.fiscal_dfe_documents
set
  direction = 'entrada',
  recipient_cnpj = regexp_replace(coalesce(cnpj,''), '\D', '', 'g'),
  updated_at = now()
where source in ('sefaz_al_entry_report','sefaz_al_entry_report_vercel')
  and document_kind = 'nfe'
  and (
    direction is distinct from 'entrada'
    or recipient_cnpj is distinct from regexp_replace(coalesce(cnpj,''), '\D', '', 'g')
  );

-- Any current AL NF-e sales reconciliation that explicitly relied on the
-- entry-report fallback is not an exhaustive sales source.
update public.fiscal_source_reconciliation
set
  status = 'pending',
  source_confirmed = false,
  source_count = null,
  missing_count = greatest(coalesce(missing_count,0),0),
  reason = 'Relatório estadual de entradas não comprova NF-e emitidas; aguardando fonte oficial de saídas.',
  checked_at = now(),
  updated_at = now()
where document_type = 'sale_nfe55'
  and coalesce(details->>'sales_source_mode','') = 'embedded_positive_fallback_only';
