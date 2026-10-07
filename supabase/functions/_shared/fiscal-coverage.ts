export type FiscalCoverageRow = {
  document_type?: string | null;
  direction?: string | null;
  applicability?: string | null;
  coverage_status?: string | null;
  source_confirmed?: boolean | null;
  evidence_level?: string | null;
  enumeration_complete?: boolean | null;
};

const applicable = (row: FiscalCoverageRow) =>
  row.direction === 'saida' &&
  ['required', 'observed'].includes(String(row.applicability || ''));

const independentlyConfirmed = (row: FiscalCoverageRow) =>
  row.coverage_status === 'covered' &&
  row.source_confirmed === true &&
  row.evidence_level === 'external_complete' &&
  row.enumeration_complete === true;

const operationallyConfirmed = (row: FiscalCoverageRow) =>
  row.source_confirmed === true;

/**
 * A covered NFS-e source must never unlock the numbered NF-e/NFC-e sales engine.
 * The engine is operational when at least one applicable model 55/65 source has
 * independently been confirmed.
 */
export const fiscalSalesCoverage = (rows: FiscalCoverageRow[]) => {
  const numberedSales = rows.filter(row =>
    applicable(row) && ['nfe55', 'nfce65'].includes(String(row.document_type || ''))
  );
  const serviceSales = rows.filter(row =>
    applicable(row) && row.document_type === 'nfse'
  );

  return {
    numberedReady: numberedSales.some(independentlyConfirmed),
    numberedOperational: numberedSales.some(operationallyConfirmed),
    serviceReady: serviceSales.some(operationallyConfirmed),
    numberedSales,
    serviceSales,
  };
};
