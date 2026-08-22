import { supabase } from "@/integrations/supabase/client";
import { WorkspaceStatus } from "@/components/admin/lancamentos/DespesasWorkspace";

export type AccountingModuleKey = "despesas" | "folha" | "compras" | "faturamento";
export type MonthModuleStatus = WorkspaceStatus | "error";
export type MonthModuleStatuses = Record<AccountingModuleKey, MonthModuleStatus>;
export type YearModuleStatuses = Record<string, MonthModuleStatuses>;

export const accountingModules: AccountingModuleKey[] = ["despesas", "folha", "compras", "faturamento"];

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
  return Boolean(candidate && typeof candidate === "object" && !Array.isArray(candidate));
}

function hasBooleanTrue(value: unknown, key: string) {
  if (!value || typeof value !== "object") return false;
  return (value as Record<string, unknown>)[key] === true;
}

export function hasModuleActivity(module: AccountingModuleKey, payload: unknown) {
  if (!payload || typeof payload !== "object") return false;
  if (module === "despesas") return hasArray(payload, "entries") || hasArray(payload, "issues");
  if (module === "folha") return hasArray(payload, "entries") || hasArray(payload, "deferredEntries") || hasArray(payload, "documentTotals") || hasBooleanTrue(payload, "referenceVerified");
  if (module === "compras") return hasArray(payload, "items") || hasArray(payload, "entries") || hasObject(payload, "reference") || hasBooleanTrue(payload, "referenceVerified");
  return hasArray(payload, "entries") || hasObject(payload, "reference") || hasBooleanTrue(payload, "referenceVerified");
}

export function hasModuleError(payload: unknown) {
  if (!payload || typeof payload !== "object") return false;
  return ["issues", "errors", "validationIssues", "warnings"].some(key => hasArray(payload, key));
}

export function resolveDynamicStatus(hasActivity: boolean, hasError: boolean, confirmedDone: boolean): MonthModuleStatus {
  if (!hasActivity) return "waiting";
  if (hasError) return "error";
  return confirmedDone ? "done" : "review";
}

function isSavedDone(value: unknown) {
  return value === "done";
}

export async function loadDynamicYearStatuses(company: string, year: string): Promise<YearModuleStatuses> {
  const result: YearModuleStatuses = {};
  for (let month = 1; month <= 12; month += 1) result[String(month).padStart(2, "0")] = emptyMonthStatuses();

  const [{ data, error }, { data: documents, error: documentsError }] = await Promise.all([
    supabase
      .from("accounting_workspace_data")
      .select("scope,module,competence,payload")
      .eq("company_key", company)
      .like("scope", `${company}:${year}:%`),
    supabase
      .from("accounting_workspace_documents")
      .select("scope,module,competence")
      .eq("company_key", company)
      .like("scope", `${company}:${year}:%`),
  ]);

  if (error) throw error;
  if (documentsError) throw documentsError;

  const explicit = data?.find(row => row.scope === `${company}:${year}:module-statuses`);
  const saved = explicit?.payload && typeof explicit.payload === "object" && !Array.isArray(explicit.payload)
    ? explicit.payload as unknown as Record<string, Partial<Record<AccountingModuleKey, WorkspaceStatus>>>
    : {};

  const state = new Map<string, { activity: boolean; error: boolean }>();
  const ensure = (month: string, module: AccountingModuleKey) => {
    const key = `${month}:${module}`;
    const current = state.get(key) ?? { activity: false, error: false };
    state.set(key, current);
    return current;
  };

  documents?.forEach(row => {
    if (!row.competence || !row.module || !accountingModules.includes(row.module as AccountingModuleKey)) return;
    const match = /^(20\d{2})-(\d{2})$/.exec(row.competence);
    if (!match || match[1] !== year || !result[match[2]]) return;
    ensure(match[2], row.module as AccountingModuleKey).activity = true;
  });

  data?.forEach(row => {
    if (!row.competence || !row.module || !accountingModules.includes(row.module as AccountingModuleKey)) return;
    const match = /^(20\d{2})-(\d{2})$/.exec(row.competence);
    if (!match || match[1] !== year || !result[match[2]]) return;
    const current = ensure(match[2], row.module as AccountingModuleKey);
    current.activity ||= hasModuleActivity(row.module as AccountingModuleKey, row.payload);
    current.error ||= hasModuleError(row.payload);
  });

  Object.keys(result).forEach(month => {
    accountingModules.forEach(module => {
      const current = state.get(`${month}:${module}`) ?? { activity: false, error: false };
      result[month][module] = resolveDynamicStatus(current.activity, current.error, isSavedDone(saved[month]?.[module]));
    });
  });

  return result;
}
