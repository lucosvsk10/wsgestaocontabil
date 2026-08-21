import { exportAccountingWorkbook } from "./accountingExportWorkbook";

export type PayrollEntryKind = "provento" | "desconto" | "encargo";
export type PayrollEntrySection = "adiantamento" | "folha" | "ferias" | "decimo" | "rescisao" | "outro";
export type PayrollMappingSource = "learned" | "predefined" | "ai" | "manual" | "unresolved";

export interface PayrollEntry {
  id: string;
  date: string;
  history: string;
  eventType?: string;
  rubricCode?: string;
  rubricDescription?: string;
  kind?: PayrollEntryKind;
  section?: PayrollEntrySection;
  debitCode: string;
  debitDescription: string;
  debitCostCenter: string;
  creditCode: string;
  creditDescription: string;
  creditCostCenter: string;
  amountInCents: number;
  source?: string;
  confidence?: number;
  targetCompetence?: string;
  mappingSource?: PayrollMappingSource;
  mappingNeedsApproval?: boolean;
  mappingConfidence?: number;
  mappingReason?: string;
  mappingRuleId?: string;
}
export interface PayrollDocumentTotal { key: string; label: string; amountInCents: number; source: string; }
export interface PayrollComparison {
  key: string;
  label: string;
  documentAmountInCents: number;
  entriesAmountInCents: number;
  differenceInCents: number;
  source: string;
  blocking?: boolean;
  note?: string;
}
export interface PayrollProcessingMeta { model: string; primaryModel: string; reviewed: boolean; reviewModel?: string | null; routing?: string | null; }

export function calculatePayrollComparisons(entries: PayrollEntry[], deferredEntries: PayrollEntry[], totals: PayrollDocumentTotal[]) {
  const documentRows = [...entries, ...deferredEntries];
  const sum = (rows: PayrollEntry[], predicate: (row: PayrollEntry) => boolean) => rows.filter(predicate).reduce((total, row) => total + row.amountInCents, 0);
  const proventos = (rows: PayrollEntry[]) => sum(rows, row => row.kind === "provento");
  const descontos = (rows: PayrollEntry[]) => sum(rows, row => row.kind === "desconto");
  const section = (value: PayrollEntrySection) => documentRows.filter(row => row.section === value);
  const totalProventos = proventos(documentRows);
  const totalDescontos = descontos(documentRows);
  const calculated: Record<string, number> = {
    total_proventos: totalProventos,
    total_descontos: totalDescontos,
    liquido: totalProventos - totalDescontos,
    adiantamento_proventos: proventos(section("adiantamento")),
    adiantamento_descontos: descontos(section("adiantamento")),
    folha_proventos: proventos(section("folha")),
    folha_descontos: descontos(section("folha")),
    ferias_proventos: proventos(section("ferias")),
    ferias_descontos: descontos(section("ferias")),
    decimo_proventos: proventos(section("decimo")),
    decimo_descontos: descontos(section("decimo")),
    rescisao_proventos: proventos(section("rescisao")),
    rescisao_descontos: descontos(section("rescisao")),
    inss_total: sum(entries, row => row.eventType === "inss" && row.kind === "desconto"),
    fgts_total: sum(entries, row => row.eventType === "fgts" && row.kind === "encargo"),
  };
  return totals.map(total => {
    const entriesAmountInCents = calculated[total.key] ?? 0;
    const informational = total.key === "inss_total";
    return {
      key: total.key,
      label: informational ? "INSS a recolher (informativo)" : total.label,
      documentAmountInCents: total.amountInCents,
      entriesAmountInCents,
      differenceInCents: entriesAmountInCents - total.amountInCents,
      source: total.source,
      blocking: !informational,
      note: informational
        ? "O Total a Recolher segue o calendário de recolhimento e pode diferir do INSS contabilizado integralmente nas rubricas da competência."
        : undefined,
    } satisfies PayrollComparison;
  });
}

export function exportPayroll(entries: PayrollEntry[], comparisons: PayrollComparison[], competence: string) {
  exportAccountingWorkbook({
    moduleTitle: "DA FOLHA DE PAGAMENTO",
    competence,
    fileName: `folha-${competence.replace("/", "-")}-calima.xlsx`,
    entries: entries.map(row => ({
      date: row.date,
      amountInCents: row.amountInCents,
      debitCode: row.debitCode,
      creditCode: row.creditCode,
      history: row.history,
      debitCostCenter: row.debitCostCenter,
      creditCostCenter: row.creditCostCenter,
      debitDescription: row.debitDescription,
      creditDescription: row.creditDescription,
      referenceCode: row.rubricCode,
      referenceDescription: row.rubricDescription || row.history,
      type: row.kind,
      section: row.section,
      mappingSource: row.mappingSource,
      mappingReason: row.mappingReason,
    })),
    comparisons,
    note: "Controle: a primeira aba contém somente as sete colunas com os nomes esperados pelo Calima. A aba Mapeamento registra os C.R.s, descrições e a origem das decisões contábeis usadas nesta competência.",
  });
}
