import { supabase } from "@/integrations/supabase/client";
import { ChartAccount } from "./chartOfAccounts";
import { ExpenseEntry, GroupedExpenseEntry, groupExpenseEntries } from "./expenseWorkbook";

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function isPayment(entry: ExpenseEntry) {
  const text = normalize(entry.history);
  return /(^|\s)(pagto|pagamento|pgt[op]?)(\.|\s|$)/i.test(text);
}

export function findCashAccount(accounts: ChartAccount[]) {
  const candidates = accounts.filter(account => account.analytical && account.reducedCode);
  return candidates.find(account => normalize(account.description).includes("caixa matriz"))
    ?? candidates.find(account => normalize(account.description).includes("caixa geral"))
    ?? null;
}

export function rawExpenseRowsForExport(entries: ExpenseEntry[]): GroupedExpenseEntry[] {
  return entries.map(entry => ({ ...entry, sourceEntryIds: [entry.id], sourceCount: 1, hasMixedCounterpart: false }));
}

export async function alignExpenseEntriesWithAI(entries: ExpenseEntry[], accounts: ChartAccount[], exportDate: string) {
  const cash = findCashAccount(accounts);
  const normalized = entries.map(entry => {
    if (!isPayment(entry) || !cash) return { ...entry };
    return {
      ...entry,
      creditCode: cash.reducedCode,
      creditDescription: cash.description,
      creditCostCenter: "",
    };
  });

  const grouped = groupExpenseEntries(normalized, "debit", exportDate);
  const payload = grouped.map((entry, index) => ({
    id: String(index),
    debitCode: entry.debitCode,
    debitDescription: entry.debitDescription,
    sourceCount: entry.sourceCount,
    isPayment: entry.sourceEntryIds.some(id => isPayment(entries.find(row => row.id === id) ?? entry)),
    currentHistory: entry.history,
    sampleHistories: entry.sourceEntryIds.slice(0, 8).map(id => entries.find(row => row.id === id)?.history ?? "").filter(Boolean),
  }));

  const { data, error } = await supabase.functions.invoke("align-expense-entries", { body: { groups: payload } });
  if (error) throw new Error("Não foi possível alinhar os históricos com IA.");
  const histories = new Map<string, string>((data?.groups ?? []).map((row: { id: string; history: string }) => [String(row.id), String(row.history || "").trim()]));

  return {
    rows: grouped.map((entry, index) => ({ ...entry, history: histories.get(String(index)) || entry.history })),
    cashAccount: cash,
  };
}
