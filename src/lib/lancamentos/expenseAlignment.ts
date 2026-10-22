import { supabase } from "@/integrations/supabase/client";
import { ChartAccount } from "./chartOfAccounts";
import { ExpenseEntry, GroupedExpenseEntry, groupExpenseEntries } from "./expenseWorkbook";

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function isPaymentHistory(history: string) {
  return /(^|\s)(pagto|pagamento|pgt[op]?)(\.|\s|$)/i.test(normalize(history));
}

function preferredExistingHistory(sourceRows: ExpenseEntry[], grouped: GroupedExpenseEntry) {
  const histories = sourceRows
    .map(row => row.history.trim())
    .filter(Boolean);

  if (!histories.length) {
    return grouped.history || grouped.debitDescription || `CONTA ${grouped.debitCode}`;
  }

  const normalizedCounts = new Map<string, { count: number; sample: string }>();
  histories.forEach(history => {
    const key = normalize(history);
    const current = normalizedCounts.get(key);
    normalizedCounts.set(key, { count: (current?.count ?? 0) + 1, sample: current?.sample ?? history });
  });

  const mostCommon = [...normalizedCounts.values()].sort((a, b) => b.count - a.count)[0]?.sample;
  return mostCommon || histories[0];
}

function fallbackHistory(grouped: GroupedExpenseEntry, sourceRows: ExpenseEntry[]) {
  const existing = preferredExistingHistory(sourceRows, grouped).trim();
  if (!existing) return grouped.history;

  if (sourceRows.some(row => isPaymentHistory(row.history))) {
    const cleaned = existing.replace(/^(PAGTO|PAGAMENTO|PGTO)\.?\s*/i, "").trim();
    return `PAGTO. ${cleaned || grouped.debitDescription || grouped.history}`.replace(/\s+/g, " ").trim().toUpperCase();
  }

  return existing.toUpperCase();
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

function groupKey(entry: Pick<ExpenseEntry, "debitCode" | "creditCode" | "debitCostCenter" | "creditCostCenter">) {
  return [
    entry.debitCode.trim(),
    entry.creditCode.trim(),
    entry.debitCostCenter || "",
    entry.creditCostCenter || "",
  ].join("::");
}

export async function loadExpenseHistoryMemory(companyKey: string, currentCompetence: string) {
  try {
    const { data, error } = await (supabase as any)
      .from("accounting_workspace_data")
      .select("competence,payload")
      .eq("company_key", companyKey)
      .eq("module", "despesas")
      .lt("competence", currentCompetence)
      .order("competence", { ascending: false })
      .limit(24);
    if (error) throw error;

    const memory = new Map<string, string>();
    for (const row of data ?? []) {
      const aligned = Array.isArray(row?.payload?.alignedEntries) ? row.payload.alignedEntries as GroupedExpenseEntry[] : [];
      for (const entry of aligned) {
        const history = String(entry.history || "").trim();
        if (!history) continue;
        const key = groupKey(entry);
        if (!memory.has(key)) memory.set(key, history);
      }
    }
    return memory;
  } catch (error) {
    console.error("Não foi possível carregar históricos padronizados de despesas.", error);
    return new Map<string, string>();
  }
}

export async function alignExpenseEntriesWithAI(entries: ExpenseEntry[], _accounts: ChartAccount[], exportDate: string, historyMemory = new Map<string, string>()) {
  // A Visão agrupada é a fonte única para o agrupamento final.
  // A partir daqui, nenhuma conta, valor, centro de custo, data ou composição do grupo pode mudar.
  const grouped = groupExpenseEntries(entries, exportDate);

  const sourceById = new Map(entries.map(entry => [entry.id, entry]));
  const payload = grouped.flatMap((entry, index) => {
    if (historyMemory.has(groupKey(entry))) return [];
    const sourceRows = entry.sourceEntryIds
      .map(id => sourceById.get(id))
      .filter((row): row is ExpenseEntry => Boolean(row));

    return [{
      id: String(index),
      debitCode: entry.debitCode,
      creditCode: entry.creditCode,
      debitCostCenter: entry.debitCostCenter || "",
      creditCostCenter: entry.creditCostCenter || "",
      sourceCount: entry.sourceCount,
      isPayment: sourceRows.some(row => isPaymentHistory(row.history)),
      currentHistory: preferredExistingHistory(sourceRows, entry),
      sampleHistories: sourceRows.map(row => row.history).filter(Boolean).slice(0, 12),
    }];
  });

  let usedAI = false;
  let histories = new Map<string, string>();
  try {
    const { data, error } = payload.length
      ? await supabase.functions.invoke("align-expense-entries", { body: { groups: payload } })
      : { data: { groups: [] }, error: null };
    if (!error && Array.isArray(data?.groups)) {
      histories = new Map<string, string>(
        data.groups.map((row: { id: string; history: string }) => [String(row.id), String(row.history || "").trim()])
      );
      usedAI = histories.size > 0;
    }
  } catch {
    // Se a IA falhar, a estrutura da Visão agrupada permanece intacta.
  }

  return {
    rows: grouped.map((entry, index) => {
      const sourceRows = entry.sourceEntryIds
        .map(id => sourceById.get(id))
        .filter((row): row is ExpenseEntry => Boolean(row));

      const learnedHistory = historyMemory.get(groupKey(entry));
      return {
        ...entry,
        // Prioridade: histórico já aprovado/usado pela empresa → IA → fallback seguro.
        // A estrutura contábil da Visão agrupada permanece intocada.
        history: learnedHistory || histories.get(String(index)) || fallbackHistory(entry, sourceRows),
      };
    }),
    cashAccount: null,
    usedAI,
  };
}
