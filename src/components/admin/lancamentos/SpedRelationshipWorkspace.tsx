import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, FileSpreadsheet, Link2, Settings2, ShieldCheck, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChartAccount } from "@/lib/lancamentos/chartOfAccounts";
import { AccountCostCenterRule, CostCenter } from "@/lib/lancamentos/costCenters";
import {
  readSpedRelationshipFiles,
  relationshipKey,
  SpedImportResult,
  SpedReferentialAccount,
  SpedRelationship,
  validateSpedRelationships,
} from "@/lib/lancamentos/spedRelationships";
import { loadWorkspaceData, saveWorkspaceData } from "@/lib/lancamentos/workspaceStorage";
import { cn } from "@/lib/utils";

export function SpedRelationshipWorkspace({ company }: { company: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [centers, setCenters] = useState<CostCenter[]>([]);
  const [costCenterRules, setCostCenterRules] = useState<AccountCostCenterRule[]>([]);
  const [relationships, setRelationships] = useState<SpedRelationship[]>([]);
  const [referentialAccounts, setReferentialAccounts] = useState<SpedReferentialAccount[]>([]);
  const [preview, setPreview] = useState<SpedImportResult | null>(null);
  const [error, setError] = useState("");
  const [manual, setManual] = useState({ accountReducedCode: "", costCenterReducedCode: "", referentialCode: "" });

  const relationshipsKey = `${company}:sped-relationships`;
  const referentialKey = `${company}:sped-referential-accounts`;

  useEffect(() => {
    let active = true;
    void Promise.all([
      loadWorkspaceData<ChartAccount[]>(`${company}:chart-of-accounts`),
      loadWorkspaceData<CostCenter[]>(`${company}:cost-centers`),
      loadWorkspaceData<AccountCostCenterRule[]>(`${company}:account-cost-center-rules`),
      loadWorkspaceData<SpedRelationship[]>(relationshipsKey),
      loadWorkspaceData<SpedReferentialAccount[]>(referentialKey),
    ]).then(([savedAccounts, savedCenters, savedRules, savedRelationships, savedReferential]) => {
      if (!active) return;
      setAccounts(savedAccounts ?? []);
      setCenters(savedCenters ?? []);
      setCostCenterRules(savedRules ?? []);
      setRelationships(savedRelationships ?? []);
      setReferentialAccounts(savedReferential ?? []);
    });
    return () => { active = false; };
  }, [company, referentialKey, relationshipsKey]);

  const validation = useMemo(
    () => validateSpedRelationships(accounts, centers, costCenterRules, relationships, referentialAccounts),
    [accounts, centers, costCenterRules, relationships, referentialAccounts],
  );
  const criticalGroups = validation.groups.filter(group => group.severity === "critical");
  const warningGroups = validation.groups.filter(group => group.severity === "warning");
  const accountMap = useMemo(() => new Map(accounts.map(account => [account.reducedCode, account])), [accounts]);
  const centerMap = useMemo(() => new Map(centers.map(center => [center.reducedCode, center])), [centers]);
  const referentialMap = useMemo(() => new Map(referentialAccounts.map(account => [account.code, account])), [referentialAccounts]);

  const importFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setError("");
    try {
      const result = await readSpedRelationshipFiles(files);
      if (!(result.detectedFiles ?? []).some(item => item.type !== "unknown")) {
        setError("Nenhum dos arquivos corresponde ao relatório de relacionamento ou ao Plano de Contas Referencial do Calima.");
        return;
      }
      setPreview(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível ler os arquivos exportados do Calima.");
    }
  };

  const confirmImport = async () => {
    if (!preview) return;

    const relationshipMap = new Map<string, SpedRelationship>();
    // Mantém o que já existe. Novos vínculos importados substituem o mesmo par Conta + C.C.;
    // vínculos manuais continuam com prioridade por último.
    relationships.filter(item => item.source !== "manual").forEach(item => relationshipMap.set(relationshipKey(item.accountReducedCode, item.costCenterReducedCode), item));
    preview.relationships.forEach(item => relationshipMap.set(relationshipKey(item.accountReducedCode, item.costCenterReducedCode), item));
    relationships.filter(item => item.source === "manual").forEach(item => relationshipMap.set(relationshipKey(item.accountReducedCode, item.costCenterReducedCode), item));
    const nextRelationships = Array.from(relationshipMap.values());

    const referenceMap = new Map<string, SpedReferentialAccount>();
    referentialAccounts.forEach(item => referenceMap.set(item.code, item));
    preview.referentialAccounts.forEach(item => {
      const previous = referenceMap.get(item.code);
      referenceMap.set(item.code, previous ? {
        ...previous,
        ...item,
        description: item.description || previous.description,
        nature: item.nature || previous.nature,
        analytical: item.analytical ?? previous.analytical,
      } : item);
    });
    const nextReferential = Array.from(referenceMap.values());

    setRelationships(nextRelationships);
    setReferentialAccounts(nextReferential);
    await Promise.all([
      saveWorkspaceData(relationshipsKey, nextRelationships),
      saveWorkspaceData(referentialKey, nextReferential),
    ]);
    setPreview(null);
  };

  const addManual = async () => {
    if (!manual.accountReducedCode || !manual.referentialCode.trim()) return;
    const nextRelation: SpedRelationship = {
      id: `manual-${crypto.randomUUID()}`,
      accountReducedCode: manual.accountReducedCode,
      costCenterReducedCode: manual.costCenterReducedCode,
      referentialCode: manual.referentialCode.trim(),
      source: "manual",
    };
    const key = relationshipKey(nextRelation.accountReducedCode, nextRelation.costCenterReducedCode);
    const next = [...relationships.filter(item => relationshipKey(item.accountReducedCode, item.costCenterReducedCode) !== key), nextRelation];
    setRelationships(next);
    await saveWorkspaceData(relationshipsKey, next);
    setManual({ accountReducedCode: "", costCenterReducedCode: "", referentialCode: "" });
  };

  const removeRelationship = async (id: string) => {
    const next = relationships.filter(item => item.id !== id);
    setRelationships(next);
    await saveWorkspaceData(relationshipsKey, next);
  };

  const hasRelations = relationships.length > 0;
  const hasCatalog = referentialAccounts.length > 0;

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="border-b border-border bg-muted/20 p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-cyan-600" /><h2 className="text-lg font-semibold">Conferência antes do SPED</h2></div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Você não precisa conhecer os códigos. Selecione os arquivos exportados do Calima e o site identifica sozinho qual é o relacionamento da empresa e qual é o catálogo referencial.</p>
          </div>
          <Button size="lg" onClick={() => inputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Importar arquivos do Calima</Button>
          <input ref={inputRef} multiple type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={event => void importFiles(event)} />
        </div>
      </div>
      <div className="grid gap-px bg-border md:grid-cols-3">
        <Step number="1" title="Selecione os arquivos" text="Pode escolher os dois de uma vez. O site descobre qual é qual." />
        <Step number="2" title="Confira o resumo" text="Mostramos quantos vínculos e quantas contas referenciais foram encontrados." />
        <Step number="3" title="Veja só os problemas" text="Erros repetidos são agrupados para você atacar a causa principal." />
      </div>
    </section>

    {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}

    {preview && <section className="rounded-xl border-2 border-cyan-500/30 bg-cyan-500/[0.04] p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">Arquivos reconhecidos</p>
          <h3 className="mt-1 text-lg font-semibold">Pronto para analisar</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-medium">{preview.relationships.length} vínculos encontrados</span>
            <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-medium">{preview.referentialAccounts.length} contas referenciais encontradas</span>
          </div>
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">{(preview.detectedFiles ?? []).map(item => <p key={`${item.name}-${item.type}`}><strong className="text-foreground">{item.name}</strong> — {fileTypeLabel(item.type)}</p>)}</div>
          {preview.warnings.map(warning => <p key={warning} className="mt-2 text-xs text-amber-700 dark:text-amber-300">{warning}</p>)}
        </div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => setPreview(null)}>Cancelar</Button><Button onClick={() => void confirmImport()}>Importar e analisar</Button></div>
      </div>
    </section>}

    {!hasRelations ? <section className="rounded-xl border border-dashed border-border bg-muted/15 p-8 text-center sm:p-12">
      <FileSpreadsheet className="mx-auto h-9 w-9 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-semibold">Primeiro, importe o relatório do Calima</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">Use o relatório que mostra <strong>Plano de Contas da Empresa</strong> de um lado e <strong>Plano de Contas Referencial</strong> do outro. Você também pode selecionar junto o catálogo completo do Plano Referencial.</p>
      <Button className="mt-5" onClick={() => inputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Escolher arquivos</Button>
      {hasCatalog && <p className="mt-4 text-xs text-emerald-700 dark:text-emerald-300">O catálogo referencial já está carregado. Falta apenas o arquivo com os vínculos da empresa.</p>}
    </section> : <>
      {validation.criticalGroups > 0 ? <section className="rounded-xl border-2 border-red-500/50 bg-red-500/[0.07] p-5 sm:p-6"><div className="flex items-start gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-500/15 text-red-600"><AlertTriangle className="h-6 w-6" /></div><div><p className="text-sm font-semibold text-red-700 dark:text-red-300">Precisa de correção</p><h3 className="mt-1 text-xl font-semibold">Encontramos {validation.criticalGroups} problema(s) importante(s)</h3><p className="mt-2 text-sm text-muted-foreground">Um problema pode afetar várias contas. Corrija as causas abaixo em vez de perseguir dezenas de críticas repetidas.</p></div></div></section>
      : <section className="rounded-xl border-2 border-emerald-500/40 bg-emerald-500/[0.06] p-5 sm:p-6"><div className="flex items-start gap-4"><CheckCircle2 className="mt-0.5 h-8 w-8 text-emerald-600" /><div><p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Estrutura conferida</p><h3 className="mt-1 text-xl font-semibold">Nenhum problema impeditivo encontrado</h3><p className="mt-2 text-sm text-muted-foreground">{validation.validRelationships} vínculo(s) foram analisados. {warningGroups.length ? `Há ${warningGroups.length} aviso(s) não impeditivo(s).` : "Não há avisos pendentes."}</p></div></div></section>}

      {criticalGroups.length > 0 && <section className="rounded-xl border border-border bg-background"><div className="border-b border-border p-5"><h3 className="font-semibold">O que precisa ser corrigido</h3><p className="mt-1 text-sm text-muted-foreground">Comece pelo primeiro item.</p></div><div className="divide-y divide-border">{criticalGroups.map((group, index) => <ProblemCard key={group.id} index={index + 1} title={plainTitle(group.code, group.title)} text={plainExplanation(group.code, group.message)} count={group.impactedCount} codes={group.impactedReducedCodes} />)}</div></section>}

      {warningGroups.length > 0 && <details className="rounded-xl border border-border bg-background"><summary className="flex cursor-pointer list-none items-center justify-between p-5"><div><h3 className="text-sm font-semibold">Avisos não impeditivos</h3><p className="mt-1 text-xs text-muted-foreground">{warningGroups.length} item(ns) para revisar depois.</p></div><ChevronDown className="h-4 w-4" /></summary><div className="space-y-3 border-t border-border p-5">{warningGroups.map(group => <div key={group.id} className="rounded-lg bg-amber-500/[0.07] p-4"><p className="text-sm font-medium">{plainTitle(group.code, group.title)}</p><p className="mt-1 text-xs text-muted-foreground">{plainExplanation(group.code, group.message)}</p></div>)}</div></details>}
    </>}

    <details className="rounded-xl border border-border bg-background">
      <summary className="flex cursor-pointer list-none items-center justify-between p-5"><div className="flex items-center gap-3"><Settings2 className="h-5 w-5 text-muted-foreground" /><div><h3 className="font-semibold">Configurações avançadas</h3><p className="mt-1 text-xs text-muted-foreground">Normalmente você não precisa mexer aqui.</p></div></div><ChevronDown className="h-4 w-4" /></summary>
      <div className="space-y-6 border-t border-border p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1.4fr)_minmax(200px,1fr)_minmax(220px,1fr)_auto]">
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={manual.accountReducedCode} onChange={event => setManual(value => ({ ...value, accountReducedCode: event.target.value }))}><option value="">Escolha a conta...</option>{accounts.filter(account => account.analytical).map(account => <option key={account.id} value={account.reducedCode}>{account.reducedCode} · {account.description}</option>)}</select>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={manual.costCenterReducedCode} onChange={event => setManual(value => ({ ...value, costCenterReducedCode: event.target.value }))}><option value="">Sem centro de custo</option>{centers.map(center => <option key={center.id} value={center.reducedCode}>{center.reducedCode} · {center.description}</option>)}</select>
          <Input list="sped-reference-list" placeholder="Código referencial" value={manual.referentialCode} onChange={event => setManual(value => ({ ...value, referentialCode: event.target.value }))} />
          <Button disabled={!manual.accountReducedCode || !manual.referentialCode.trim()} onClick={() => void addManual()}><Link2 className="mr-2 h-4 w-4" />Vincular</Button>
          <datalist id="sped-reference-list">{referentialAccounts.filter(item => item.analytical !== false).map(item => <option key={item.code} value={item.code}>{item.description}</option>)}</datalist>
        </div>

        <div className="overflow-hidden rounded-lg border border-border"><div className="border-b border-border px-4 py-3 text-sm font-semibold">Vínculos importados</div><div className="max-h-[520px] overflow-auto"><table className="w-full min-w-[900px] text-xs"><thead className="sticky top-0 bg-muted/95 text-left text-muted-foreground"><tr><th className="border-b border-r border-border px-3 py-2">Conta da empresa</th><th className="border-b border-r border-border px-3 py-2">Centro de custo</th><th className="border-b border-r border-border px-3 py-2">Conta referencial</th><th className="w-12 border-b border-border" /></tr></thead><tbody>{relationships.slice(0, 500).map(relation => { const account = accountMap.get(relation.accountReducedCode); const center = relation.costCenterReducedCode ? centerMap.get(relation.costCenterReducedCode) : null; const reference = referentialMap.get(relation.referentialCode); return <tr key={relation.id} className="border-b border-border last:border-0"><td className="border-r border-border px-3 py-2">{relation.accountReducedCode} · {account?.description ?? relation.accountCode ?? "Conta não localizada"}</td><td className="border-r border-border px-3 py-2">{center ? `${center.reducedCode} · ${center.description}` : "Sem C.C."}</td><td className="border-r border-border px-3 py-2"><span className="font-mono">{relation.referentialCode}</span>{reference?.description ? ` · ${reference.description}` : ""}</td><td className="px-2 py-1"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => void removeRelationship(relation.id)}><Trash2 className="h-3.5 w-3.5" /></Button></td></tr>; })}{!relationships.length && <tr><td colSpan={4} className="h-28 text-center text-muted-foreground">Nenhum vínculo importado.</td></tr>}</tbody></table></div></div>
      </div>
    </details>
  </div>;
}

function Step({ number, title, text }: { number: string; title: string; text: string }) { return <div className="bg-background p-4 sm:p-5"><div className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-500/10 text-xs font-bold text-cyan-700 dark:text-cyan-300">{number}</span><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p></div></div></div>; }

function ProblemCard({ index, title, text, count, codes }: { index: number; title: string; text: string; count: number; codes: string[] }) { return <div className="p-5"><div className="flex items-start gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-red-500/15 text-xs font-bold text-red-700 dark:text-red-300">{index}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{title}</p><p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p><details className="mt-3"><summary className="cursor-pointer text-xs font-medium text-muted-foreground">Ver {count} conta(s) afetada(s)</summary><div className="mt-2 flex flex-wrap gap-1.5">{codes.slice(0, 80).map(code => <span key={code} className="rounded border border-border bg-muted/50 px-2 py-1 text-[10px]">C.R. {code}</span>)}</div></details></div></div></div>; }

function fileTypeLabel(type: NonNullable<SpedImportResult["detectedFiles"]>[number]["type"]) { if (type === "calima_relationship") return "relacionamento da empresa com o plano referencial"; if (type === "calima_catalog") return "catálogo completo do plano referencial"; if (type === "generic") return "arquivo de relacionamento reconhecido"; return "formato não reconhecido"; }

function plainTitle(code: string, fallback: string) { const map: Record<string, string> = { ACCOUNT_NOT_FOUND: "Há vínculos apontando para contas que não existem", PARENT_MISSING: "A hierarquia do plano de contas está quebrada", COST_CENTER_NOT_FOUND: "Um centro de custo usado não existe", I051_DUPLICATE: "A mesma conta está ligada a dois destinos diferentes", NATURE_MISMATCH: "Uma conta está ligada à categoria errada", REQUIRED_CENTER_RELATION_MISSING: "Falta completar o vínculo de uma conta que exige centro de custo", REFERENCE_NOT_FOUND: "Falta o catálogo de algumas contas referenciais", SPED_ACCOUNT_UNMAPPED: "Existem contas do SPED ainda sem vínculo" }; return map[code] ?? fallback; }
function plainExplanation(code: string, fallback: string) { const map: Record<string, string> = { ACCOUNT_NOT_FOUND: "O arquivo do Calima trouxe um vínculo para uma conta que não foi encontrada no Plano de Contas desta empresa.", PARENT_MISSING: "Uma conta filha não encontrou a conta superior correta. Esse tipo de erro pode gerar muitas críticas em cascata.", COST_CENTER_NOT_FOUND: "Um vínculo usa um centro de custo que não está cadastrado na empresa.", I051_DUPLICATE: "A mesma combinação de conta e centro de custo está apontando para mais de uma conta referencial. Ela precisa ter apenas um destino.", NATURE_MISMATCH: "A conta da empresa e a categoria oficial escolhida têm naturezas contábeis incompatíveis.", REQUIRED_CENTER_RELATION_MISSING: "A conta foi configurada para exigir centro de custo, mas ainda falta ligar essa combinação a uma conta referencial.", REFERENCE_NOT_FOUND: "O vínculo existe, mas o catálogo completo da Receita ainda não foi importado para conferir descrição e natureza.", SPED_ACCOUNT_UNMAPPED: "Algumas contas marcadas para participar do SPED ainda não possuem vínculo referencial." }; return map[code] ?? fallback; }
