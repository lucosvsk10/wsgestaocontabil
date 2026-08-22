import * as XLSX from "xlsx";
import { ChartAccount } from "./chartOfAccounts";
import { AccountCostCenterRule, CostCenter } from "./costCenters";

export type SpedNature = "A" | "P" | "PL" | "R" | "D" | "";

export interface SpedReferentialAccount {
  code: string;
  description: string;
  nature: SpedNature;
  analytical?: boolean;
  source: string;
}

export interface SpedRelationship {
  id: string;
  accountReducedCode: string;
  accountCode?: string;
  costCenterReducedCode: string;
  referentialCode: string;
  source: "imported" | "manual";
}

export interface SpedImportResult {
  relationships: SpedRelationship[];
  referentialAccounts: SpedReferentialAccount[];
  warnings: string[];
  detectedFiles?: Array<{ name: string; type: "calima_relationship" | "calima_catalog" | "generic" | "unknown" }>;
}

export type SpedIssueSeverity = "critical" | "warning";

export interface SpedValidationGroup {
  id: string;
  severity: SpedIssueSeverity;
  code: string;
  title: string;
  message: string;
  impactedReducedCodes: string[];
  impactedCount: number;
}

export interface SpedValidationResult {
  groups: SpedValidationGroup[];
  criticalGroups: number;
  warningGroups: number;
  impactedAccounts: number;
  validRelationships: number;
  totalRelationships: number;
}

const normalize = (value: unknown) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[._/()-]+/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

function findHeaderIndex(headers: string[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalize);
  return headers.findIndex(header => normalizedAliases.some(alias => header === alias || header.includes(alias)));
}

function parseNature(value: unknown): SpedNature {
  const text = normalize(value);
  if (!text) return "";
  if (text === "a" || text.includes("ativo")) return "A";
  if (text === "pl" || text.includes("patrimonio liquido")) return "PL";
  if (text === "p" || text.includes("passivo")) return "P";
  if (text === "r" || text.includes("receita")) return "R";
  if (text === "d" || text.includes("despesa") || text.includes("custo")) return "D";
  return "";
}

function inferReferenceNature(code: string, description: string): SpedNature {
  const explicit = parseNature(description);
  if (explicit) return explicit;
  if (code === "1" || code.startsWith("1.")) return "A";
  // Os demais grupos podem variar conforme o plano referencial. Sem um título de grupo
  // inequívoco, é mais seguro não inventar natureza.
  return "";
}

function dedupeRelationships(items: SpedRelationship[]) {
  const map = new Map<string, SpedRelationship>();
  items.forEach(item => {
    const key = `${item.accountReducedCode}|${item.costCenterReducedCode}|${item.referentialCode}`;
    if (!map.has(key)) map.set(key, item);
  });
  return Array.from(map.values());
}

function dedupeReferential(items: SpedReferentialAccount[]) {
  const map = new Map<string, SpedReferentialAccount>();
  items.forEach(item => {
    if (!item.code) return;
    const previous = map.get(item.code);
    if (!previous || (!previous.description && item.description) || (previous.nature === "" && item.nature !== "")) map.set(item.code, item);
  });
  return Array.from(map.values());
}

function rowText(row: unknown[]) {
  return row.map(value => normalize(value)).join(" ");
}

function looksLikeReferentialCode(value: unknown) {
  return /^\d+(?:\.\d+)+$/.test(String(value ?? "").trim());
}

function parseCalimaRelationshipRows(rows: unknown[][], fileName: string, sheetName: string) {
  const relationships: SpedRelationship[] = [];
  const referentialAccounts: SpedReferentialAccount[] = [];
  rows.forEach((row, index) => {
    const reduced = String(row[0] ?? "").trim();
    const companyAccount = String(row[2] ?? "").trim();
    const companyDescription = String(row[5] ?? "").trim();
    const reference = String(row[8] ?? "").trim();
    const referenceDescription = String(row[9] ?? "").trim();

    if (normalize(reduced) === "c r" || normalize(companyAccount) === "conta") return;
    if (!/^\d+$/.test(companyAccount) || !companyDescription) return;
    if (!looksLikeReferentialCode(reference)) return;

    referentialAccounts.push({
      code: reference,
      description: referenceDescription,
      nature: inferReferenceNature(reference, referenceDescription),
      source: fileName,
    });
    relationships.push({
      id: `${fileName}:${sheetName}:${index + 1}`,
      accountReducedCode: reduced,
      accountCode: companyAccount,
      // A coluna “CX” do relatório do Calima não é o Centro de Custo do I100/I051.
      costCenterReducedCode: "",
      referentialCode: reference,
      source: "imported",
    });
  });
  return { relationships, referentialAccounts };
}

function parseCalimaCatalogRows(rows: unknown[][], fileName: string) {
  const referentialAccounts: SpedReferentialAccount[] = [];
  rows.forEach(row => {
    const code = String(row[0] ?? "").trim();
    const description = String(row[2] ?? "").trim();
    const type = normalize(row[6]);
    if (normalize(code) === "conta" || !looksLikeReferentialCode(code) && !/^\d+$/.test(code)) return;
    if (!description || (type !== "analitica" && type !== "sintetica")) return;
    referentialAccounts.push({
      code,
      description,
      nature: inferReferenceNature(code, description),
      analytical: type === "analitica",
      source: fileName,
    });
  });
  return referentialAccounts;
}

function parseGenericSheet(rows: unknown[][], fileName: string, sheetName: string) {
  const relationships: SpedRelationship[] = [];
  const referentialAccounts: SpedReferentialAccount[] = [];
  const headerRow = rows.findIndex(row => {
    const headers = row.map(normalize);
    const hasAccount = findHeaderIndex(headers, ["cr", "c r", "codigo reduzido", "conta contabil", "conta"]) >= 0;
    const hasReference = findHeaderIndex(headers, ["conta referencial", "codigo referencial", "cod cta ref", "conta sped", "referencial"]) >= 0;
    return hasAccount && hasReference;
  });
  if (headerRow < 0) return { relationships, referentialAccounts };

  const headers = rows[headerRow].map(normalize);
  const index = {
    reduced: findHeaderIndex(headers, ["cr", "c r", "codigo reduzido", "conta reduzida", "cr conta"]),
    account: findHeaderIndex(headers, ["conta contabil", "codigo conta", "conta"]),
    costCenter: findHeaderIndex(headers, ["centro de custo", "codigo centro de custo", "cod ccus", "ccus", "c c", "cc"]),
    reference: findHeaderIndex(headers, ["conta referencial", "codigo referencial", "cod cta ref", "conta sped", "referencial"]),
    referenceDescription: findHeaderIndex(headers, ["descricao referencial", "descricao conta referencial", "titulo referencial"]),
    nature: findHeaderIndex(headers, ["natureza referencial", "natureza", "nat conta"]),
  };

  rows.slice(headerRow + 1).forEach((row, offset) => {
    const reduced = String(index.reduced >= 0 ? row[index.reduced] ?? "" : "").trim();
    const account = String(index.account >= 0 ? row[index.account] ?? "" : "").trim();
    const costCenter = String(index.costCenter >= 0 ? row[index.costCenter] ?? "" : "").trim();
    const reference = String(index.reference >= 0 ? row[index.reference] ?? "" : "").trim();
    const referenceDescription = String(index.referenceDescription >= 0 ? row[index.referenceDescription] ?? "" : "").trim();
    const nature = parseNature(index.nature >= 0 ? row[index.nature] : "");
    if (!reference && !reduced && !account) return;
    if (reference) referentialAccounts.push({ code: reference, description: referenceDescription, nature, source: fileName });
    if (!reference || (!reduced && !account)) return;
    relationships.push({
      id: `${fileName}:${sheetName}:${headerRow + offset + 2}`,
      accountReducedCode: reduced,
      accountCode: account || undefined,
      costCenterReducedCode: costCenter,
      referentialCode: reference,
      source: "imported",
    });
  });
  return { relationships, referentialAccounts };
}

export async function readSpedRelationships(file: File): Promise<SpedImportResult> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const relationships: SpedRelationship[] = [];
  const referentialAccounts: SpedReferentialAccount[] = [];
  const warnings: string[] = [];
  let detected: SpedImportResult["detectedFiles"][number]["type"] = "unknown";

  workbook.SheetNames.forEach(sheetName => {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: "", raw: true });
    const texts = rows.slice(0, 15).map(rowText);
    const hasCompanyTitle = texts.some(text => text.includes("plano de contas da empresa"));
    const hasReferenceTitle = texts.some(text => text.includes("plano de contas referencial"));

    if (hasCompanyTitle && hasReferenceTitle) {
      detected = "calima_relationship";
      const parsed = parseCalimaRelationshipRows(rows, file.name, sheetName);
      relationships.push(...parsed.relationships);
      referentialAccounts.push(...parsed.referentialAccounts);
      return;
    }

    if (!hasCompanyTitle && hasReferenceTitle) {
      detected = "calima_catalog";
      referentialAccounts.push(...parseCalimaCatalogRows(rows, file.name));
      return;
    }

    const generic = parseGenericSheet(rows, file.name, sheetName);
    if (generic.relationships.length || generic.referentialAccounts.length) detected = "generic";
    relationships.push(...generic.relationships);
    referentialAccounts.push(...generic.referentialAccounts);
  });

  const cleanRelationships = dedupeRelationships(relationships);
  const cleanReferential = dedupeReferential(referentialAccounts);
  if (detected === "unknown") warnings.push(`O arquivo “${file.name}” não corresponde a um formato de relacionamento/plano referencial reconhecido.`);
  else if (detected === "calima_catalog") warnings.push("Catálogo referencial do Calima reconhecido. Ele complementa os vínculos da empresa e não substitui relacionamentos já importados.");
  else if (detected === "calima_relationship" && !cleanRelationships.length) warnings.push("O relatório do Calima foi reconhecido, mas não há contas da empresa com referência preenchida.");

  return {
    relationships: cleanRelationships,
    referentialAccounts: cleanReferential,
    warnings,
    detectedFiles: [{ name: file.name, type: detected }],
  };
}

export async function readSpedRelationshipFiles(files: File[]): Promise<SpedImportResult> {
  const results = await Promise.all(files.map(readSpedRelationships));
  return {
    relationships: dedupeRelationships(results.flatMap(result => result.relationships)),
    referentialAccounts: dedupeReferential(results.flatMap(result => result.referentialAccounts)),
    warnings: results.flatMap(result => result.warnings),
    detectedFiles: results.flatMap(result => result.detectedFiles ?? []),
  };
}

function rootNature(account: ChartAccount, accounts: ChartAccount[]): SpedNature {
  const explicit = parseNature((account as ChartAccount & { nature?: string }).nature);
  if (explicit) return explicit;
  const ancestors = accounts
    .filter(candidate => candidate.account.length <= account.account.length && account.account.startsWith(candidate.account))
    .sort((a, b) => a.account.length - b.account.length);
  const root = ancestors[0] ?? account;
  const title = normalize(root.description);
  if (title.includes("ativo")) return "A";
  if (title.includes("passivo")) return "P";
  if (title.includes("patrimonio liquido")) return "PL";
  if (title.includes("receita")) return "R";
  if (title.includes("despesa") || title.includes("custo")) return "D";
  return "";
}

function inferredParent(account: ChartAccount, accounts: ChartAccount[]) {
  const explicitParent = String((account as ChartAccount & { parentAccount?: string }).parentAccount ?? "").trim();
  if (explicitParent) return accounts.find(candidate => candidate.account === explicitParent) ?? null;
  return accounts
    .filter(candidate => !candidate.analytical && candidate.account.length < account.account.length && account.account.startsWith(candidate.account))
    .sort((a, b) => b.account.length - a.account.length)[0] ?? null;
}

function addGroup(groups: Map<string, SpedValidationGroup>, code: string, severity: SpedIssueSeverity, title: string, message: string, impactedReducedCodes: string[]) {
  const clean = Array.from(new Set(impactedReducedCodes.filter(Boolean)));
  if (!clean.length) return;
  const key = `${severity}:${code}:${title}`;
  const existing = groups.get(key);
  if (existing) {
    existing.impactedReducedCodes = Array.from(new Set([...existing.impactedReducedCodes, ...clean]));
    existing.impactedCount = existing.impactedReducedCodes.length;
    return;
  }
  groups.set(key, { id: key, severity, code, title, message, impactedReducedCodes: clean, impactedCount: clean.length });
}

export function validateSpedRelationships(
  accounts: ChartAccount[],
  centers: CostCenter[],
  costCenterRules: AccountCostCenterRule[],
  relationships: SpedRelationship[],
  referentialAccounts: SpedReferentialAccount[],
): SpedValidationResult {
  const groups = new Map<string, SpedValidationGroup>();
  const accountByReduced = new Map(accounts.map(account => [account.reducedCode, account]));
  const accountByCode = new Map(accounts.map(account => [account.account, account]));
  const centerCodes = new Set(centers.map(center => center.reducedCode));
  const referenceMap = new Map(referentialAccounts.map(reference => [reference.code, reference]));
  const requiredCenter = new Map(costCenterRules.filter(rule => rule.required).map(rule => [rule.accountReducedCode, rule.costCenterReducedCode]));

  const resolvedRelationships = relationships.map(relation => {
    const account = accountByReduced.get(relation.accountReducedCode)
      ?? (relation.accountCode ? accountByCode.get(relation.accountCode) : undefined)
      ?? null;
    return { relation, account };
  });

  addGroup(groups, "ACCOUNT_NOT_FOUND", "critical", "Relacionamento aponta para conta inexistente", "Há relacionamentos que não encontram uma conta correspondente no Plano de Contas da empresa.", resolvedRelationships.filter(item => !item.account).map(item => item.relation.accountReducedCode || item.relation.accountCode || "desconhecida"));

  const missingParents: string[] = [];
  accounts.forEach(account => {
    const hasShorterPrefix = accounts.some(candidate => candidate.account.length < account.account.length && account.account.startsWith(candidate.account));
    if (hasShorterPrefix && !inferredParent(account, accounts)) missingParents.push(account.reducedCode);
  });
  addGroup(groups, "PARENT_MISSING", "critical", "Conta sem pai sintético válido", "A hierarquia da conta não encontrou uma conta superior sintética. Um erro de parentesco pode se propagar para dezenas de críticas.", missingParents);

  addGroup(groups, "COST_CENTER_NOT_FOUND", "critical", "Centro de custo usado no relacionamento não existe", "O relacionamento usa um centro de custo ausente do cadastro.", resolvedRelationships.filter(item => item.account && item.relation.costCenterReducedCode && !centerCodes.has(item.relation.costCenterReducedCode)).map(item => item.account!.reducedCode));

  const keyToReferences = new Map<string, Set<string>>();
  resolvedRelationships.forEach(({ relation, account }) => {
    if (!account) return;
    const key = `${account.reducedCode}|${relation.costCenterReducedCode}`;
    const refs = keyToReferences.get(key) ?? new Set<string>();
    refs.add(relation.referentialCode);
    keyToReferences.set(key, refs);
  });
  const duplicates: string[] = [];
  keyToReferences.forEach((refs, key) => { if (refs.size > 1) duplicates.push(key.split("|")[0]); });
  addGroup(groups, "I051_DUPLICATE", "critical", "A mesma conta está ligada a mais de um destino", "Cada combinação de conta e centro de custo deve apontar para uma única conta referencial.", duplicates);

  addGroup(groups, "REFERENCE_NOT_FOUND", "warning", "Conta referencial não está no catálogo importado", "O vínculo existe, mas o código não foi encontrado no catálogo referencial importado.", resolvedRelationships.filter(item => item.account && item.relation.referentialCode && !referenceMap.has(item.relation.referentialCode)).map(item => item.account!.reducedCode));

  const natureMismatch: string[] = [];
  resolvedRelationships.forEach(({ relation, account }) => {
    if (!account) return;
    const reference = referenceMap.get(relation.referentialCode);
    if (!reference?.nature) return;
    const localNature = rootNature(account, accounts);
    if (localNature && localNature !== reference.nature) natureMismatch.push(account.reducedCode);
  });
  addGroup(groups, "NATURE_MISMATCH", "critical", "Conta ligada a uma categoria incompatível", "A natureza contábil da conta da empresa é incompatível com a conta referencial escolhida.", natureMismatch);

  const missingRequiredCenterRelationship: string[] = [];
  requiredCenter.forEach((center, reducedCode) => {
    const has = resolvedRelationships.some(item => item.account?.reducedCode === reducedCode && item.relation.costCenterReducedCode === center && Boolean(item.relation.referentialCode));
    if (!has) missingRequiredCenterRelationship.push(reducedCode);
  });
  addGroup(groups, "REQUIRED_CENTER_RELATION_MISSING", "critical", "Conta que exige centro de custo está sem o vínculo completo", "A conta exige centro de custo no lançamento, mas a combinação Conta + Centro de Custo ainda não possui conta referencial definida.", missingRequiredCenterRelationship);

  const spedAccountsWithoutRelationship = accounts
    .filter(account => account.analytical && account.sped)
    .filter(account => !resolvedRelationships.some(item => item.account?.reducedCode === account.reducedCode && Boolean(item.relation.referentialCode)))
    .map(account => account.reducedCode);
  addGroup(groups, "SPED_ACCOUNT_UNMAPPED", "warning", "Contas do SPED ainda sem vínculo", "Existem contas marcadas para SPED que ainda não têm uma conta referencial vinculada.", spedAccountsWithoutRelationship);

  const allGroups = Array.from(groups.values()).sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "critical" ? -1 : 1;
    return b.impactedCount - a.impactedCount;
  });
  const impacted = new Set(allGroups.flatMap(group => group.impactedReducedCodes));
  const invalidKeys = new Set(allGroups.filter(group => group.severity === "critical").flatMap(group => group.impactedReducedCodes));
  const validRelationships = resolvedRelationships.filter(item => item.account && !invalidKeys.has(item.account.reducedCode)).length;

  return {
    groups: allGroups,
    criticalGroups: allGroups.filter(group => group.severity === "critical").length,
    warningGroups: allGroups.filter(group => group.severity === "warning").length,
    impactedAccounts: impacted.size,
    validRelationships,
    totalRelationships: relationships.length,
  };
}

export function relationshipKey(accountReducedCode: string, costCenterReducedCode: string) {
  return `${accountReducedCode}|${costCenterReducedCode}`;
}
