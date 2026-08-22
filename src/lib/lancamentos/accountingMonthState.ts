import { supabase } from "@/integrations/supabase/client";
import { WorkspaceStatus } from "@/components/admin/lancamentos/DespesasWorkspace";

export type AccountingModuleKey = "despesas" | "folha" | "compras" | "faturamento";
export type MonthModuleStatuses = Record<AccountingModuleKey, WorkspaceStatus>;
export type YearModuleStatuses = Record<string, MonthModuleStatuses>;

const modules: AccountingModuleKey[] = ["despesas", "folha", "compras", "faturamento"];

export const emptyMonthStatuses = (): MonthModuleStatuses => ({
  despesas: "waiting",
  folha: "waiting",
  compras: "waiting",
  faturamento: "waiting",
});

function hasArray(value: unknown, key: string) {
  if (!value || typeof value !== "object") return false;
  const candidate = (value as Record<string, unknown>)[key];
  return Array.isArray(candidate) && candidate.length > 0;
}

function hasObject(value: unknown, key: string) {
  if (!value || typeof value !== "object") return false;
  const candidate = (value as Record<string, unknown>)[key];
  return Boolean(candidate && typeof candidate === "object");
}

function hasBooleanTrue(value: unknown, key: string) {
  if (!value || typeof value !== "object") return false;
  return (value as Record<string, unknown>)[key] === true;
}

function hasModuleActivity(module: AccountingModuleKey, payload: unknown) {
  if (!payload || typeof payload !== "object") return false;
  if (module === "despesas") return hasArray(payload, "entries") || hasArray(payload, "issues");
  if (module === "folha") return hasArray(payload, "entries") || hasArray(payload, "deferredEntries") || hasArray(payload, "documentTotals") || hasBooleanTrue(payload, "referenceVerified");
  if (module === "compras") return hasArray(payload, "items") || hasArray(payload, "entries") || hasObject(payload, "reference") || hasBooleanTrue(payload, "referenceVerified");
  return hasArray(payload, "entries") || hasObject(payload, "reference") || hasBooleanTrue(payload, "referenceVerified");
}

function normalizeStatus(value: unknown): WorkspaceStatus {
  return value === "done" || value === "review" || value === "waiting" ? value : "waiting";
}

export async function loadDynamicYearStatuses(company: string, year: string): Promise<YearModuleStatuses> {
  const result: YearModuleStatuses = {};
  for (let month = 1; month <= 12; month += 1) result[String(month).padStart(2, "0")] = emptyMonthStatuses();

  const { data, error } = await supabase
    .from("accounting_workspace_data")
    .select("scope,module,competence,payload")
    .eq("company_key", company)
    .like("scope", `${company}:${year}:%`);

  if (error) throw error;

  const explicit = data?.find(row => row.scope === `${company}:${year}:module-statuses`);
  if (explicit?.payload && typeof explicit.payload === "object" && !Array.isArray(explicit.payload)) {
    const saved = explicit.payload as unknown as Record<string, Partial<Record<AccountingModuleKey, WorkspaceStatus>>>;
    Object.entries(saved).forEach(([month, statuses]) => {
      if (!result[month]) return;
      modules.forEach(module => { result[month][module] = normalizeStatus(statuses?.[module]); });
    });
  }

  data?.forEach(row => {
    if (!row.competence || !row.module || !modules.includes(row.module as AccountingModuleKey)) return;
    const match = /^(20\d{2})-(\d{2})$/.exec(row.competence);
    if (!match || match[1] !== year) return;
    const month = match[2];
    const module = row.module as AccountingModuleKey;
    if (!result[month] || result[month][module] === "done") return;
    if (hasModuleActivity(module, row.payload)) result[month][module] = "review";
  });

  return result;
}
