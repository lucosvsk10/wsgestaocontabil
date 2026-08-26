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

function fallbackHistory(entry: GroupedExpenseEntry, payment: boolean) {
  const base = (entry.debitDescription || entry.history || `CONTA ${entry.debitCode}`).trim().toUpperCase();
  if (!payment) return base;
  const withoutPrefix = base.replace(/^(PAGTO|PAGAMENTO|PGTO)\.?\s*/i, "");
  return `PAGTO. ${withoutPrefix}`.replace(/\s+/g, " ").trim();
}

export function findCashAccount(accounts: ChartAccount[]) {
  const candidates = accounts.filter(account => account.analytical && account.reducedCode);
  return candidates.find(account => account.reducedCode.trim() === "1" && normalize(account.description).includes("caixa geral"))
    ?? candidates.find(account => normalize(account.description).includes("caixa geral"))
    ?? null;
}

export function rawExpenseRowsForExport(entries: ExpenseEntry[]): GroupedExpenseEntry[] {
  return entries.map(entry => ({ ...entry, sourceEntryIds: [entry.id], sourceCount: 1, hasMixedCounterpart: false }));
}

export async function alignExpenseEntriesWithAI(entries: ExpenseEntry[], accounts: ChartAccount[], exportDate: string) {
  const cash = findCashAccount(accounts);
  const paymentById = new Map(entries.map(entry => [entry.id, isPayment(entry)]));
  const normalized = entries.map(entry => {
    if (!paymentById.get(entry.id) || !cash) return { ...entry };
    return { ...entry, creditCode: cash.reducedCode, creditDescription: cash.description, creditCostCenter: "" };
  });

  const grouped = groupExpenseEntries(normalized, "debit", exportDate);
  const isGroupPayment = (entry: GroupedExpenseEntry) => entry.sourceEntryIds.some(id => paymentById.get(id));
  const payload = grouped.map((entry, index) => ({
    id: String(index),
    debitCode: entry.debitCode,
    debitDescription: entry.debitDescription,
    sourceCount: entry.sourceCount,
    isPayment: isGroupPayment(entry),
    currentHistory: entry.history,
    sampleHistories: entry.sourceEntryIds.slice(0, 8).map(id => entries.find(row => row.id === id)?.history ?? "").filter(Boolean),
  }));

  let usedAI = false;
  let histories = new Map<string, string>();
  try {
    const { data, error } = await supabase.functions.invoke("align-expense-entries", { body: { groups: payload } });
    if (!error && Array.isArray(data?.groups)) {
      histories = new Map<string, string>(data.groups.map((row: { id: string; history: string }) => [String(row.id), String(row.history || "").trim()]));
      usedAI = histories.size > 0;
    }
  } catch {
    // O agrupamento determinístico continua disponível se a Edge Function estiver temporariamente indisponível.
  }

  return {
    rows: grouped.map((entry, index) => ({ ...entry, history: histories.get(String(index)) || fallbackHistory(entry, isGroupPayment(entry)) })),
    cashAccount: cash,
    usedAI,
  };
}
