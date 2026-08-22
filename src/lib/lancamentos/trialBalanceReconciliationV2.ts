import { AccountingExportEntry } from "./accountingExportWorkbook";
import { ChartAccount } from "./chartOfAccounts";
import { applyConfiguredCostCenters } from "./costCenters";
import { ExpenseEntry } from "./expenseWorkbook";
import { PayrollEntry } from "./payrollWorkbook";
import { PurchaseEntry, PurchaseReference } from "./purchaseWorkbook";
import { RevenueEntry, RevenueReference } from "./revenueWorkbook";
import { TrialBalanceAutoTarget, TrialBalanceObservation } from "./trialBalanceAutoAdjustment";
import {
  analyticalTrialBalanceRows,
  normalizeTrialBalanceText,
  signedBalance,
  TrialBalanceRow,
  validateTrialBalanceRow,
} from "./trialBalance";
import { loadWorkspaceData } from "./workspaceStorage";

interface ExpensePayload { entries?: ExpenseEntry[]; }
interface PayrollPayload { entries?: PayrollEntry[]; }
interface PurchasePayload { entries?: PurchaseEntry[]; reference?: PurchaseReference | null; }
interface RevenuePayload { entries?: RevenueEntry[]; reference?: RevenueReference | null; }

export interface TrialBalanceClosingPolicy {
  supplierPaymentRateByYear?: Record<string, number>;
  cashTargetMinInCents?: number;
  cashTargetMaxInCents?: number;
  cashTargetAnchorInCents?: number;
  payPriorLiabilitiesFully?: boolean;
  source?: string;
}

export interface CriticalTrialBalancePlan {
  competence: string;
  observations: TrialBalanceObservation[];
  targets: TrialBalanceAutoTarget[];
  adjustments: AccountingExportEntry[];
  previewRows: TrialBalanceRow[];
  remainingCriticalObservations: TrialBalanceObservation[];
  correctionComplete: boolean;
  previousBalanceVerified: boolean;
  currentCashSignedInCents: number | null;
  targetCashSignedInCents: number | null;
  projectedCashSignedInCents: number | null;
  operatingScaleInCents: number;
  contextSummary: string[];
  expectedEntryCount: number;
  alreadyPostedCount: number;
  missingEntryCount: number;
  unmappedEntryCount: number;
  costCenterIssues: string[];
  generatedAt: string;
}

type SavedEntry = ExpenseEntry | PayrollEntry | PurchaseEntry | RevenueEntry;
type AliasKey = keyof typeof aliases;

const aliases = {
  cash: ["caixa matriz", "caixa geral", "caixa"],
  clients: ["clientes diversos", "clientes", "duplicatas a receber"],
  suppliers: ["fornecedores diversos", "fornecedores"],
  inventory: ["material aplicado", "mercadorias p revenda", "mercadorias para revenda", "estoque mercadorias"],
  salariesPayable: ["salarios a pagar", "salários a pagar", "salarios e remuneracoes a pagar", "salários e remunerações a pagar"],
  vacationPayable: ["ferias a pagar", "férias a pagar", "provisao para ferias", "provisão para férias"],
  terminationPayable: ["rescisao a pagar", "rescisão a pagar"],
  thirteenthPayable: ["13 salario a pagar", "13º salário a pagar"],
  fgtsPayable: ["fgts a recolher", "fgts à recolher"],
  inssPayable: ["inss a recolher", "inss à recolher"],
  irrfPayable: ["irrf s salarios a recolher", "irrf s/salários à recolher", "irrf a recolher"],
  prolaborePayable: ["pro labore a pagar", "pro-labore a pagar", "pró-labore a pagar"],
  simplesPayable: ["simples a recolher", "simples à recolher"],
  serviceRevenue: ["venda de servicos", "venda de serviços", "receita da prestacao de servicos", "receita da prestação de serviços"],
  merchandiseRevenue: ["revendas de mercadorias", "revenda de mercadorias", "receita da revenda de mercadorias"],
  simplesExpense: ["impostos simples", "simples nacional", "(-) simples"],
  salaryExpense: ["salarios", "salários", "ordenados", "remuneracoes", "remunerações"],
  prolaboreExpense: ["pro labore", "pro-labore", "pró-labore", "remuneracao a dirigentes", "remuneração a dirigentes"],
  vacationExpense: ["ferias", "férias", "provisoes para ferias", "provisões para férias"],
  fgtsExpense: ["fgts", "encargos sociais fgts"],
  foodExpense: ["vale alimentacao", "vale alimentação", "vale refeicao", "vale refeição", "alimentacao do trabalhador", "alimentação do trabalhador"],
  recoveredPersonnel: ["recup desp c pessoal", "recuperacao despesa pessoal", "recuperação despesa pessoal"],
  advanceSalary: ["adto salarios", "adiantamentos funcionarios", "adiantamentos funcionários"],
} as const;

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Math.abs(cents) / 100);
const currentSigned = (row: TrialBalanceRow) => signedBalance(row.currentBalanceInCents, row.currentNature);
const previousSigned = (row: TrialBalanceRow) => signedBalance(row.previousBalanceInCents, row.previousNature);

function analytical(rows: TrialBalanceRow[]) {
  return analyticalTrialBalanceRows(rows).filter(row => Boolean(row.reducedCode));
}

function findAlias(rows: TrialBalanceRow[], key: AliasKey) {
  const terms = aliases[key].map(normalizeTrialBalanceText);
  const candidates = analytical(rows).filter(row => {
    const title = normalizeTrialBalanceText(row.title);
    return terms.some(term => title === term || title.includes(term));
  });
  if (key === "fgtsExpense") return candidates.find(row => !normalizeTrialBalanceText(row.title).includes("recolher")) ?? null;
  if (key === "prolaboreExpense") return candidates.find(row => !/pagar|recolher/.test(normalizeTrialBalanceText(row.title))) ?? candidates[0] ?? null;
  if (key === "vacationExpense") return candidates.find(row => !/pagar|provisao/.test(normalizeTrialBalanceText(row.title))) ?? candidates[0] ?? null;
  if (key === "salaryExpense") return candidates.find(row => !/pagar/.test(normalizeTrialBalanceText(row.title))) ?? candidates[0] ?? null;
  if (key === "simplesExpense") return candidates.find(row => !/recolher/.test(normalizeTrialBalanceText(row.title))) ?? candidates[0] ?? null;
  return candidates[0] ?? null;
}

function findExact(rows: TrialBalanceRow[], reducedCode: string) {
  return analytical(rows).find(row => row.reducedCode === String(reducedCode ?? "")) ?? null;
}

function tokenScore(a: string, b: string) {
  const ignored = new Set(["de", "da", "do", "das", "dos", "a", "e", "para", "no", "na", "em", "mercado", "interno", "gerais", "diversos"]);
  const tokens = (value: string) => new Set(normalizeTrialBalanceText(value).split(" ").filter(token => token.length > 2 && !ignored.has(token)));
  const left = tokens(a); const right = tokens(b);
  if (!left.size || !right.size) return 0;
  let hit = 0;
  left.forEach(token => { if (right.has(token)) hit += 1; });
  return hit / Math.max(left.size, right.size);
}

function currentAccount(accounts: ChartAccount[], reducedCode: string) {
  return accounts.find(account => account.reducedCode === reducedCode) ?? null;
}

function semanticAlias(description: string, account: ChartAccount | null, side: "debit" | "credit"): AliasKey | null {
  const text = normalizeTrialBalanceText(description || account?.description || "");
  const accountCode = String(account?.account ?? "");
  const patrimonialLiability = accountCode.startsWith("2") || /a pagar|a recolher|provisao/.test(text);

  if (/cliente|duplicata.*receber/.test(text)) return "clients";
  if (/fornecedor/.test(text)) return "suppliers";
  if (/caixa/.test(text) && !/banco/.test(text)) return "cash";
  if (/mercadorias? para revenda|material aplicado|estoque.*mercadoria/.test(text)) return "inventory";
  if (/adiantamento.*funcionario|adiantamento.*salario/.test(text)) return "advanceSalary";

  if (/salario|salário|ordenado|remunerac/.test(text)) return patrimonialLiability ? "salariesPayable" : "salaryExpense";
  if (/ferias|férias/.test(text)) return patrimonialLiability ? "vacationPayable" : "vacationExpense";
  if (/rescis/.test(text)) return "terminationPayable";
  if (/13.*salario|13º.*salário/.test(text)) return "thirteenthPayable";
  if (/fgts/.test(text)) return patrimonialLiability || /recolher/.test(text) ? "fgtsPayable" : "fgtsExpense";
  if (/inss/.test(text)) return "inssPayable";
  if (/irrf/.test(text)) return "irrfPayable";
  if (/pro.?labore|dirigente/.test(text)) return patrimonialLiability ? "prolaborePayable" : "prolaboreExpense";
  if (/simples/.test(text)) return patrimonialLiability || /recolher/.test(text) ? "simplesPayable" : "simplesExpense";
  if (/alimentacao|alimentação|refeicao|refeição/.test(text)) return "foodExpense";
  if (/recup|recupera/.test(text) && /pessoal|despesa/.test(text)) return "recoveredPersonnel";
  if (/prestacao de servico|prestação de serviço|venda de servico|venda de serviço/.test(text)) return "serviceRevenue";
  if (/receita.*revenda|revenda de mercadoria/.test(text) && !/estoque|material aplicado/.test(text)) return "merchandiseRevenue";

  if (side === "credit" && /receita.*servico|receita.*serviço/.test(text)) return "serviceRevenue";
  return null;
}

function resolveBalanceRow(rows: TrialBalanceRow[], reducedCode: string, description: string, accounts: ChartAccount[], side: "debit" | "credit") {
  const exact = findExact(rows, reducedCode);
  if (exact) return exact;
  const account = currentAccount(accounts, reducedCode);
  const alias = semanticAlias(description, account, side);
  if (alias) {
    const found = findAlias(rows, alias);
    if (found) return found;
  }

  const sourceDescription = description || account?.description || "";
  let best: TrialBalanceRow | null = null;
  let bestScore = 0;
  analytical(rows).forEach(row => {
    const score = tokenScore(sourceDescription, row.title);
    if (score > bestScore) { bestScore = score; best = row; }
  });
  return bestScore >= 0.6 ? best : null;
}

function exportEntry(row: SavedEntry, section: string): AccountingExportEntry {
  const flexible = row as SavedEntry & { rubricCode?: string; rubricDescription?: string; kind?: string; mappingSource?: string; mappingReason?: string };
  return {
    date: row.date,
    amountInCents: row.amountInCents,
    debitCode: row.debitCode,
    creditCode: row.creditCode,
    history: row.history,
    debitCostCenter: row.debitCostCenter,
    creditCostCenter: row.creditCostCenter,
    debitDescription: row.debitDescription,
    creditDescription: row.creditDescription,
    referenceCode: flexible.rubricCode,
    referenceDescription: flexible.rubricDescription,
    type: flexible.kind ?? section,
    section,
    mappingSource: flexible.mappingSource ?? "predefined",
    mappingReason: flexible.mappingReason ?? `Lançamento conferido em ${section}.`,
  };
}

function bridgeEntry(entry: AccountingExportEntry, rows: TrialBalanceRow[], accounts: ChartAccount[]) {
  const debit = resolveBalanceRow(rows, entry.debitCode, entry.debitDescription ?? "", accounts, "debit");
  const credit = resolveBalanceRow(rows, entry.creditCode, entry.creditDescription ?? "", accounts, "credit");
  if (!debit || !credit) return null;
  return {
    ...entry,
    debitCode: debit.reducedCode,
    creditCode: credit.reducedCode,
    debitDescription: debit.title,
    creditDescription: credit.title,
    mappingReason: `${entry.mappingReason ?? ""} Contas convertidas para o C.R. do Balancete importado.`,
  } satisfies AccountingExportEntry;
}

function closingDate(month: string, year: string) {
  return `${String(new Date(Number(year), Number(month), 0).getDate()).padStart(2, "0")}/${month}/${year}`;
}

function previousCompetence(month: string, year: string) {
  const date = new Date(Number(year), Number(month) - 2, 1);
  return { month: String(date.getMonth() + 1).padStart(2, "0"), year: String(date.getFullYear()) };
}

function total(entries: Array<{ amountInCents: number }>) {
  return entries.reduce((sum, entry) => sum + Math.abs(entry.amountInCents), 0);
}

function journal(date: string, amount: number, debit: TrialBalanceRow, credit: TrialBalanceRow, history: string, reason: string, type: string): AccountingExportEntry {
  return {
    date,
    amountInCents: Math.round(Math.abs(amount)),
    debitCode: debit.reducedCode,
    creditCode: credit.reducedCode,
    history,
    debitCostCenter: "",
    creditCostCenter: "",
    debitDescription: debit.title,
    creditDescription: credit.title,
    referenceCode: type,
    referenceDescription: history,
    type,
    section: "balancete",
    mappingSource: "predefined",
    mappingReason: reason,
  };
}

function cashTarget(company: string, month: string, year: string, previousCash: number, policy: TrialBalanceClosingPolicy) {
  const min = Math.max(0, policy.cashTargetMinInCents ?? 60_000);
  const max = Math.max(min, policy.cashTargetMaxInCents ?? 180_000);
  const anchor = previousCash >= min && previousCash <= max ? previousCash : Math.min(max, Math.max(min, policy.cashTargetAnchorInCents ?? 100_000));
  let hash = 0;
  for (const char of `${company}:${year}:${month}`) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const variation = 0.90 + (hash % 2601) / 10_000; // 0,90 a 1,1600
  return Math.min(max, Math.max(min, Math.round(anchor * variation)));
}

function supplierRate(policy: TrialBalanceClosingPolicy, year: string, operatingScale: number, purchaseBase: number) {
  const learned = Number(policy.supplierPaymentRateByYear?.[year]);
  if (Number.isFinite(learned) && learned > 0 && learned <= 1) return learned;
  if (!purchaseBase) return 0;
  return Math.min(0.9, Math.max(0.5, 0.55 + Math.min(1, operatingScale / purchaseBase) * 0.25));
}

function movementMap(rows: TrialBalanceRow[]) {
  const debit = new Map<string, number>();
  const credit = new Map<string, number>();
  analytical(rows).forEach(row => {
    debit.set(row.reducedCode, row.debitInCents);
    credit.set(row.reducedCode, row.creditInCents);
  });
  return { debit, credit };
}

function consume(rows: TrialBalanceRow[], expected: AccountingExportEntry[]) {
  const residual = movementMap(rows);
  const posted: AccountingExportEntry[] = [];
  const missing: AccountingExportEntry[] = [];
  expected.forEach(entry => {
    const d = residual.debit.get(entry.debitCode) ?? 0;
    const c = residual.credit.get(entry.creditCode) ?? 0;
    if (d + 2 >= entry.amountInCents && c + 2 >= entry.amountInCents) {
      residual.debit.set(entry.debitCode, Math.max(0, d - entry.amountInCents));
      residual.credit.set(entry.creditCode, Math.max(0, c - entry.amountInCents));
      posted.push(entry);
    } else missing.push(entry);
  });
  return { posted, missing };
}

function signedMovement(entries: AccountingExportEntry[], reducedCode: string) {
  return entries.reduce((sum, entry) => sum + (entry.debitCode === reducedCode ? entry.amountInCents : 0) - (entry.creditCode === reducedCode ? entry.amountInCents : 0), 0);
}

function paymentLabel(key: AliasKey, reference: string) {
  const labels: Partial<Record<AliasKey, string>> = {
    salariesPayable: "PAGTO. SALÁRIOS E REMUNERAÇÕES",
    vacationPayable: "PAGTO. FÉRIAS",
    terminationPayable: "PAGTO. RESCISÃO",
    thirteenthPayable: "PAGTO. 13º SALÁRIO",
    fgtsPayable: "PAGTO. FGTS",
    inssPayable: "PAGTO. INSS",
    irrfPayable: "PAGTO. IRRF S/SALÁRIOS",
    prolaborePayable: "PAGTO. PRO-LABORE",
    simplesPayable: "PAGTO. SIMPLES NACIONAL",
  };
  return `${labels[key] ?? "PAGTO."} REF. ${reference}`;
}

function apply(rows: TrialBalanceRow[], adjustments: AccountingExportEntry[]) {
  const direct = rows.map(row => {
    if (!row.reducedCode) return row;
    const debitAdded = adjustments.filter(entry => entry.debitCode === row.reducedCode).reduce((sum, entry) => sum + entry.amountInCents, 0);
    const creditAdded = adjustments.filter(entry => entry.creditCode === row.reducedCode).reduce((sum, entry) => sum + entry.amountInCents, 0);
    if (!debitAdded && !creditAdded) return row;
    const debitInCents = row.debitInCents + debitAdded;
    const creditInCents = row.creditInCents + creditAdded;
    const signed = previousSigned(row) + debitInCents - creditInCents;
    return { ...row, debitInCents, creditInCents, currentBalanceInCents: Math.abs(signed), currentNature: Math.abs(signed) <= 1 ? "" : signed > 0 ? "D" : "C" } as TrialBalanceRow;
  });

  const leaves = analytical(direct);
  const leafIds = new Set(leaves.map(row => row.id));
  const path = (value: string) => value.split(".").map(part => Number(part)).filter(part => Number.isFinite(part));
  const descendant = (parent: number[], child: number[]) => parent.length < child.length && parent.every((part, index) => child[index] === part);
  const leafPaths = leaves.map(row => ({ row, path: path(row.accountCode) }));
  return direct.map(row => {
    if (leafIds.has(row.id)) return row;
    const parent = path(row.accountCode);
    const children = leafPaths.filter(item => descendant(parent, item.path)).map(item => item.row);
    if (!children.length) return row;
    const prev = children.reduce((sum, child) => sum + previousSigned(child), 0);
    const cur = children.reduce((sum, child) => sum + currentSigned(child), 0);
    return {
      ...row,
      previousBalanceInCents: Math.abs(prev), previousNature: Math.abs(prev) <= 1 ? "" : prev > 0 ? "D" : "C",
      debitInCents: children.reduce((sum, child) => sum + child.debitInCents, 0),
      creditInCents: children.reduce((sum, child) => sum + child.creditInCents, 0),
      currentBalanceInCents: Math.abs(cur), currentNature: Math.abs(cur) <= 1 ? "" : cur > 0 ? "D" : "C",
    } as TrialBalanceRow;
  });
}

function threshold(scale: number) { return Math.max(100_000, Math.round(scale * 0.005)); }

function observation(row: TrialBalanceRow, headline: string, message: string, source: string, suggested?: number): TrialBalanceObservation {
  return { id: `${row.id}:${headline}`, rowId: row.id, reducedCode: row.reducedCode, title: row.title, severity: "critical", headline, message, currentSignedInCents: currentSigned(row), suggestedSignedInCents: suggested, source };
}

function criticals(rows: TrialBalanceRow[], missing: AccountingExportEntry[], scale: number, target: number | null, unmapped: number) {
  const out: TrialBalanceObservation[] = [];
  const min = threshold(scale);
  const push = (item: TrialBalanceObservation) => { if (!out.some(existing => existing.id === item.id)) out.push(item); };
  const impact = new Map<string, number>();
  missing.forEach(entry => {
    impact.set(entry.debitCode, (impact.get(entry.debitCode) ?? 0) + entry.amountInCents);
    impact.set(entry.creditCode, (impact.get(entry.creditCode) ?? 0) + entry.amountInCents);
  });
  impact.forEach((amount, code) => {
    if (amount < min) return;
    const row = findExact(rows, code); if (!row) return;
    push(observation(row, "Movimento material faltando", `Faltam ${money(amount)} em lançamentos que atingem esta conta.`, "Reconciliação dos módulos e pagamentos mensais"));
  });
  analytical(rows).forEach(row => {
    const difference = validateTrialBalanceRow(row);
    if (Math.abs(difference) > min) push(observation(row, "Linha não fecha", `Diferença aritmética de ${money(difference)}.`, "Saldo anterior + débitos - créditos × saldo atual"));
  });
  const cash = findAlias(rows, "cash");
  if (cash) {
    const value = currentSigned(cash);
    if (value < -min) push(observation(cash, "Caixa credor", `O Caixa está ${money(value)} C.`, "Política de fechamento de Caixa", target ?? undefined));
    else if (target !== null && value > Math.max(target * 8, min * 4)) push(observation(cash, "Caixa muito alto", `O Caixa está ${money(value)} D e a faixa operacional calculada está perto de ${money(target)}.`, "Histórico da empresa + competência", target));
  }
  if (unmapped > 0) {
    const anchor = cash ?? analytical(rows)[0];
    if (anchor) push(observation(anchor, "Existem contas não reconhecidas", `${unmapped} lançamento(s) esperado(s) ainda não puderam ser ligados a uma conta analítica deste Balancete.`, "Ponte semântica entre Plano de Contas e Balancete"));
  }
  return out;
}

function targets(rows: TrialBalanceRow[], preview: TrialBalanceRow[], adjustments: AccountingExportEntry[]) {
  const codes = new Set<string>(); adjustments.forEach(entry => { codes.add(entry.debitCode); codes.add(entry.creditCode); });
  return Array.from(codes).map(code => {
    const current = findExact(rows, code); const projected = findExact(preview, code);
    if (!current || !projected) return null;
    return { key: `cr-${code}`, label: current.title, row: current, currentSignedInCents: currentSigned(current), targetSignedInCents: currentSigned(projected), source: "Reconciliação do movimento completo da competência.", confidence: 0.99 } satisfies TrialBalanceAutoTarget;
  }).filter((item): item is TrialBalanceAutoTarget => Boolean(item));
}

export async function buildCriticalTrialBalancePlan(company: string, month: string, year: string, rows: TrialBalanceRow[]): Promise<CriticalTrialBalancePlan> {
  const prefix = `${company}:${year}:${month}`;
  const prev = previousCompetence(month, year);
  const prevPrefix = `${company}:${prev.year}:${prev.month}`;
  const [expenses, payroll, purchases, revenue, previousPurchases, policy, accounts] = await Promise.all([
    loadWorkspaceData<ExpensePayload>(`${prefix}:despesas:parsed`),
    loadWorkspaceData<PayrollPayload>(`${prefix}:folha:parsed`),
    loadWorkspaceData<PurchasePayload>(`${prefix}:compras:parsed`),
    loadWorkspaceData<RevenuePayload>(`${prefix}:faturamento:parsed`),
    loadWorkspaceData<PurchasePayload>(`${prevPrefix}:compras:parsed`),
    loadWorkspaceData<TrialBalanceClosingPolicy>(`${company}:balancete:closing-policy`),
    loadWorkspaceData<ChartAccount[]>(`${company}:chart-of-accounts`),
  ]);
  const chart = accounts ?? [];
  const rawOperational = [
    ...(expenses?.entries ?? []).map(entry => exportEntry(entry, "despesas")),
    ...(payroll?.entries ?? []).filter(entry => entry.amountInCents > 0).map(entry => exportEntry(entry, "folha")),
    ...(purchases?.entries ?? []).map(entry => exportEntry(entry, "compras")),
    ...(revenue?.entries ?? []).map(entry => exportEntry(entry, "faturamento")),
  ];
  const withCenters = await applyConfiguredCostCenters(company, rawOperational, chart);
  const bridged = withCenters.map(entry => bridgeEntry(entry, rows, chart));
  const operational: AccountingExportEntry[] = bridged.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const unmappedOperational = bridged.filter(entry => !entry).length;

  const revenueTotal = revenue?.reference?.totalAmountInCents ?? total(rawOperational.filter(entry => entry.section === "faturamento" && !normalizeTrialBalanceText(entry.history).includes("pgdas")));
  const purchaseTotal = purchases?.reference?.totalAmountInCents ?? total(rawOperational.filter(entry => entry.section === "compras"));
  const operatingScale = Math.max(1, revenueTotal + purchaseTotal + total(rawOperational.filter(entry => entry.section === "despesas")) + Math.round(total(rawOperational.filter(entry => entry.section === "folha")) / 2));
  const closingPolicy = policy ?? {};
  const previousVerified = rows.length > 0 && rows.every(row => (row as TrialBalanceRow & { previousBalanceRead?: boolean }).previousBalanceRead === true);
  const date = closingDate(month, year);
  const cash = findAlias(rows, "cash");
  const clients = findAlias(rows, "clients");
  const suppliers = findAlias(rows, "suppliers");
  const inventory = findAlias(rows, "inventory");
  const targetCash = cash ? cashTarget(company, month, year, Math.max(0, previousSigned(cash)), closingPolicy) : null;
  const closing: AccountingExportEntry[] = [];

  if (cash && closingPolicy.payPriorLiabilitiesFully !== false) {
    const keys: AliasKey[] = ["salariesPayable", "vacationPayable", "terminationPayable", "thirteenthPayable", "fgtsPayable", "inssPayable", "irrfPayable", "prolaborePayable", "simplesPayable"];
    keys.forEach(key => {
      const row = findAlias(rows, key);
      if (!row || previousSigned(row) >= -1) return;
      closing.push(journal(date, Math.abs(previousSigned(row)), row, cash, paymentLabel(key, `${prev.month}/${prev.year}`), `Quitação do saldo anterior de ${row.title}.`, `pagamento_${key}`));
    });

    if (suppliers) {
      const previousPurchaseFromSite = previousPurchases?.reference?.totalAmountInCents ?? total((previousPurchases?.entries ?? []));
      const previousInventory = inventory ? Math.max(0, previousSigned(inventory)) : 0;
      const purchaseBase = previousPurchaseFromSite || previousInventory || Math.abs(Math.min(0, previousSigned(suppliers)));
      const rate = supplierRate(closingPolicy, year, operatingScale, purchaseBase);
      const amount = Math.round(purchaseBase * rate);
      if (amount > 0) closing.push(journal(date, amount, suppliers, cash, `PAGTO. FORNECEDORES REF. ${prev.month}/${prev.year}`, `Pagamento calculado sobre a compra/estoque da competência anterior (${money(purchaseBase)}) × ${(rate * 100).toFixed(1)}%.`, "pagamento_fornecedores"));
    }
  }

  if (cash && clients && targetCash !== null) {
    const beforeReceipt = [...operational, ...closing];
    const cashBefore = previousSigned(cash) + signedMovement(beforeReceipt, cash.reducedCode);
    const clientBefore = previousSigned(clients) + signedMovement(beforeReceipt, clients.reducedCode);
    const receipt = Math.min(Math.max(0, targetCash - cashBefore), Math.max(0, clientBefore));
    if (receipt > 0) closing.push(journal(date, receipt, cash, clients, `RECEBIMENTO DE CLIENTES MÊS ${month}/${year}`, `Recebimento calculado para encerrar Caixa perto de ${money(targetCash)}, sem ultrapassar o saldo real disponível em Clientes.`, "recebimento_clientes"));
  }

  const expected = [...operational, ...closing].filter(entry => entry.amountInCents > 0 && entry.debitCode && entry.creditCode);
  const reconciliation = consume(rows, expected);
  const previewRows = apply(rows, reconciliation.missing);
  const secondPass = consume(previewRows, expected);
  const projectedCashRow = cash ? findExact(previewRows, cash.reducedCode) : null;
  const projectedCash = projectedCashRow ? currentSigned(projectedCashRow) : null;
  const originalCritical = criticals(rows, reconciliation.missing, operatingScale, targetCash, unmappedOperational);
  const remainingCritical = criticals(previewRows, secondPass.missing, operatingScale, targetCash, unmappedOperational);
  const materialArithmetic = analytical(previewRows).filter(row => Math.abs(validateTrialBalanceRow(row)) > threshold(operatingScale));
  const movementDifference = analytical(previewRows).reduce((sum, row) => sum + row.debitInCents - row.creditInCents, 0);
  const minCash = closingPolicy.cashTargetMinInCents ?? 60_000;
  const maxCash = closingPolicy.cashTargetMaxInCents ?? 180_000;
  const cashOk = projectedCash === null || (projectedCash >= minCash && projectedCash <= maxCash);
  const correctionComplete = previousVerified && unmappedOperational === 0 && secondPass.missing.length === 0 && remainingCritical.length === 0 && materialArithmetic.length === 0 && Math.abs(movementDifference) <= 1 && cashOk;

  const costCenterIssues = expected.flatMap((entry, index) => {
    const issues: string[] = [];
    if (entry.section !== "balancete" && !entry.debitCostCenter && !entry.creditCostCenter && /receita|despesa|folha|faturamento/i.test(`${entry.section} ${entry.debitDescription} ${entry.creditDescription}`)) {
      // Informação para conferência, não bloqueia contas patrimoniais.
      issues.push(`Linha ${index + 1}: confira se alguma das contas exige centro de custo.`);
    }
    return issues;
  });

  const contextSummary = [
    `Esperados ${expected.length} lançamento(s): ${reconciliation.posted.length} já estão no Balancete e ${reconciliation.missing.length} serão gerados como ajuste.`,
    `${unmappedOperational} lançamento(s) dos módulos não encontraram conta equivalente no Balancete${unmappedOperational ? " e bloqueiam o fechamento" : ""}.`,
    cash ? `Caixa: saldo anterior ${money(previousSigned(cash))} ${previousSigned(cash) < 0 ? "C" : "D"}; alvo variável ${money(targetCash ?? 0)}; projetado ${projectedCash === null ? "—" : `${money(projectedCash)} ${projectedCash < 0 ? "C" : "D"}`}.` : "Caixa não localizado.",
    `Pagamentos anteriores são reconstruídos pelo Saldo Anterior; Fornecedores usa compra/estoque anterior e política do exercício. Movimentos já lançados não são duplicados.`,
  ];

  return {
    competence: `${month}/${year}`,
    observations: originalCritical,
    targets: targets(rows, previewRows, reconciliation.missing),
    adjustments: reconciliation.missing,
    previewRows,
    remainingCriticalObservations: remainingCritical,
    correctionComplete,
    previousBalanceVerified: previousVerified,
    currentCashSignedInCents: cash ? currentSigned(cash) : null,
    targetCashSignedInCents: targetCash,
    projectedCashSignedInCents: projectedCash,
    operatingScaleInCents: operatingScale,
    contextSummary,
    expectedEntryCount: expected.length,
    alreadyPostedCount: reconciliation.posted.length,
    missingEntryCount: reconciliation.missing.length,
    unmappedEntryCount: unmappedOperational,
    costCenterIssues,
    generatedAt: new Date().toISOString(),
  };
}

export function criticalTrialBalancePlanIsCorrected(plan: CriticalTrialBalancePlan | null | undefined) {
  return Boolean(plan?.correctionComplete && plan.previousBalanceVerified && plan.remainingCriticalObservations.length === 0 && plan.unmappedEntryCount === 0);
}

export const __test = { cashTarget, supplierRate, consume, apply, bridgeEntry, resolveBalanceRow };
