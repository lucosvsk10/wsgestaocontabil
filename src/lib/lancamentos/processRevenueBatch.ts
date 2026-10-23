import { ChartAccount } from "./chartOfAccounts";
import { RevenueBatchResult } from "./revenueBatch";
import { detectRevenueCompetencesDeterministically, parseRevenueFilesDeterministically } from "./revenueDeterministic";
import { WRONG_COMPETENCE_IMPORT_EVENT, WrongCompetenceImportCancelledError, WrongCompetenceImportRequest } from "./workspaceStorage";

interface Args {
  company: string;
  files: File[];
  accounts: ChartAccount[];
}

export interface RevenueCompetenceDetection {
  competences: string[];
  hasUndatedPeriodicBlocks: boolean;
  undatedBlockCount: number;
  evidence: string[];
  warning: string;
}

export async function detectRevenueCompetences(files: File[]): Promise<RevenueCompetenceDetection> {
  if (!files.length) throw new Error("Nenhum relatório de faturamento foi selecionado.");
  const competences = await detectRevenueCompetencesDeterministically(files);
  return {
    competences,
    hasUndatedPeriodicBlocks: false,
    undatedBlockCount: 0,
    evidence: competences.map(value => `Competência identificada diretamente no PDF: ${value}`),
    warning: "",
  };
}

function currentCompetence(company: string) {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem(`ws:lancamentos:last-context:${company}`);
    if (!raw) return "";
    const context = JSON.parse(raw) as { year?: string; selectedMonth?: string; selectedModule?: string };
    if (context.selectedModule !== "faturamento" || !context.year || !context.selectedMonth) return "";
    return `${context.selectedMonth}/${context.year}`;
  } catch {
    return "";
  }
}

async function confirmDetectedCompetence(company: string, files: File[], detectedCompetence: string) {
  const current = currentCompetence(company);
  if (!current || current === detectedCompetence || typeof window === "undefined") return true;
  return new Promise<boolean>((resolve) => {
    const detail: WrongCompetenceImportRequest = {
      currentCompetence: current,
      detectedCompetence,
      module: "faturamento",
      fileNames: files.map(file => file.name),
      resolve,
    };
    window.dispatchEvent(new CustomEvent<WrongCompetenceImportRequest>(WRONG_COMPETENCE_IMPORT_EVENT, { detail }));
  });
}

export async function processRevenueBatch({ company, files, accounts }: Args): Promise<RevenueBatchResult> {
  if (!files.length) throw new Error("Nenhum relatório de faturamento foi selecionado.");
  if (!accounts.length) throw new Error("Importe o plano de contas desta empresa antes de processar Faturamento.");

  const detected = await detectRevenueCompetencesDeterministically(files);
  if (detected.length === 1) {
    const keep = await confirmDetectedCompetence(company, files, detected[0]);
    if (!keep) throw new WrongCompetenceImportCancelledError();
  }
  if (!detected.length) throw new Error("Faturamento: não foi possível identificar competência e valor no PDF.");

  return parseRevenueFilesDeterministically(company, files, accounts);
}
