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

function standardizeExpenseHistory(history: string, entry: GroupedExpenseEntry, sourceRows: ExpenseEntry[]) {
  const original = [history, entry.debitDescription, ...sourceRows.map(row => row.history)].join(" ");
  const normalized = normalize(original);
  const current = normalize(history);
  // Não mudar valores/contas, nem confundir movimentações patrimoniais com pagamentos.
  if (/^(transferencia|transf\\.?|baixa de? |estorno|ajuste|apropriacao)/.test(current)) {
    return history.trim().toUpperCase();
  }
  const isSupplier = /insumos|materiais? diretos?|fornecedores?/.test(normalized);
  const isBank = /juros bancarios?|despesas bancarias?|tarifas? bancarias?/.test(normalized);
  let label = history.replace(/^(PAGTO|PAGAMENTO|PGTO)\\.?\\s*/i, "").trim().toUpperCase();
  if (isSupplier) label = "FORNECEDORES";
  else if (isBank) label = "DESPESAS BANCÁRIAS";
  else if (/despesas? com telefone|telefonia|telecomunicac/.test(normalized)) label = "DESPESAS COM TELEFONE";
  else if (/despesas? com veicul|manutencao de veicul/.test(normalized)) label = "DESPESAS COM VEÍCULOS";
  else if (/material de limpeza|materiais de limpeza|higiene e limpeza/.test(normalized)) label = "MATERIAL DE LIMPEZA";
  else if (/prestacao de servico|servicos prestados|servicos de terceiros/.test(normalized)) label = "PRESTAÇÃO DE SERVIÇOS";
  if (!label) label = (entry.debitDescription || history).trim().toUpperCase();
  return `PAGTO. ${label}`;
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

function fullGroupKey(entry: Pick<ExpenseEntry, "debitCode" | "creditCode" | "debitCostCenter" | "creditCostCenter">) {
  return [
    entry.debitCode.trim(),
    entry.creditCode.trim(),
    entry.debitCostCenter || "",
    entry.creditCostCenter || "",
  ].join("::");
}

function accountPairKey(entry: Pick<ExpenseEntry, "debitCode" | "creditCode">) {
  return [entry.debitCode.trim(), entry.creditCode.trim()].join("::");
}

type ExpenseHistoryMemory = {
  exact: Map<string, string>;
  byAccountPair: Map<string, string>;
};

function learnedHistoryFor(entry: ExpenseEntry, memory: ExpenseHistoryMemory) {
  return memory.exact.get(fullGroupKey(entry)) || memory.byAccountPair.get(accountPairKey(entry));
}

export async function loadExpenseHistoryMemory(companyKey: string, currentCompetence: string): Promise<ExpenseHistoryMemory> {
  const emptyMemory = { exact: new Map<string, string>(), byAccountPair: new Map<string, string>() };
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

    const memory: ExpenseHistoryMemory = emptyMemory;
    for (const row of data ?? []) {
      const aligned = Array.isArray(row?.payload?.alignedEntries) ? row.payload.alignedEntries as GroupedExpenseEntry[] : [];
      for (const entry of aligned) {
        const history = String(entry.history || "").trim();
        if (!history) continue;
        const exactKey = fullGroupKey(entry);
        const pairKey = accountPairKey(entry);
        if (!memory.exact.has(exactKey)) memory.exact.set(exactKey, history);
        if (!memory.byAccountPair.has(pairKey)) memory.byAccountPair.set(pairKey, history);
      }
    }
    return memory;
  } catch (error) {
    console.error("Não foi possível carregar históricos padronizados de despesas.", error);
    return emptyMemory;
  }
}

export async function alignExpenseEntriesWithAI(
  entries: ExpenseEntry[],
  _accounts: ChartAccount[],
  exportDate: string,
  historyMemory: ExpenseHistoryMemory = { exact: new Map(), byAccountPair: new Map() },
) {
  // A Visão agrupada é a fonte única para o agrupamento final.
  // A partir daqui, nenhuma conta, valor, centro de custo, data ou composição do grupo pode mudar.
  const grouped = groupExpenseEntries(entries, exportDate);

  const sourceById = new Map(entries.map(entry => [entry.id, entry]));
  const payload = grouped.flatMap((entry, index) => {
    if (learnedHistoryFor(entry, historyMemory)) return [];
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

      const learnedHistory = learnedHistoryFor(entry, historyMemory);
      return {
        ...entry,
        // Prioridade: histórico já aprovado/usado pela empresa → IA → fallback seguro.
        // A estrutura contábil da Visão agrupada permanece intocada.
        history: standardizeExpenseHistory(learnedHistory || histories.get(String(index)) || fallbackHistory(entry, sourceRows), entry, sourceRows),
      };
    }),
    cashAccount: null,
    usedAI,
  };
}
