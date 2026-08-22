import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, BrainCircuit, CheckCircle2, ChevronDown, FileSpreadsheet, Link2, Loader2, Settings2, ShieldCheck, Sparkles, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChartAccount } from "@/lib/lancamentos/chartOfAccounts";
import { detectNumberedWsPlan, groupFromAccountCode, groupLabel } from "@/lib/lancamentos/accountPlanProfile";
import { AccountCostCenterRule, CostCenter } from "@/lib/lancamentos/costCenters";
import { generateAutomaticSpedMappings, GeneratedSpedRelationship } from "@/lib/lancamentos/spedAutoMapping";
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
  const [mapping, setMapping] = useState(false);
  const [mappingSummary, setMappingSummary] = useState<string | null>(null);
  const [query, setQuery] = useState("");
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

  const planProfile = useMemo(() => detectNumberedWsPlan(accounts), [accounts]);
  const validation = useMemo(
    () => validateSpedRelationships(accounts, centers, costCenterRules, relationships, referentialAccounts),
    [accounts, centers, costCenterRules, relationships, referentialAccounts],
  );
  const accountMap = useMemo(() => new Map(accounts.map(account => [account.reducedCode, account])), [accounts]);
  const centerMap = useMemo(() => new Map(centers.map(center => [center.reducedCode, center])), [centers]);
  const referenceMap = useMemo(() => new Map(referentialAccounts.map(account => [account.code, account])), [referentialAccounts]);
  const ruleMap = useMemo(() => new Map(costCenterRules.map(rule => [rule.accountReducedCode, rule])), [costCenterRules]);
  const relationshipMap = useMemo(() => {
    const map = new Map<string, SpedRelationship>();
    relationships.forEach(relation => {
      const previous = map.get(relation.accountReducedCode);
      if (!previous || relation.source === "manual") map.set(relation.accountReducedCode, relation);
    });
    return map;
  }, [relationships]);

  const analyticalAccounts = useMemo(() => accounts.filter(account => account.analytical && account.reducedCode), [accounts]);
  const filteredAccounts = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return analyticalAccounts
      .filter(account => !term || `${account.account} ${account.reducedCode} ${account.description}`.toLocaleLowerCase("pt-BR").includes(term))
      .slice(0, 350);
  }, [analyticalAccounts, query]);
  const unmappedCount = analyticalAccounts.filter(account => !relationshipMap.has(account.reducedCode)).length;

  const generateBridge = async () => {
    setError("");
    setMappingSummary(null);
    if (!planProfile.detected) {
      setError("Este Plano de Contas não foi reconhecido como a estrutura 1 Ativo / 2 Passivo / 3 Receita / 4 Despesa / 6 Resultado. A automação ficou bloqueada para não mapear contas erradas.");
      return;
    }
    if (!referentialAccounts.length) {
      setError("A base referencial da Receita ainda não está carregada. Para esta empresa ela deve ser cadastrada uma única vez; depois o Calima deixa de fazer parte do fluxo normal.");
      return;
    }

    setMapping(true);
    try {
      const result = await generateAutomaticSpedMappings(company, accounts, referentialAccounts);
      const generated = result.relationships.map(relation => ({
        ...relation,
        costCenterReducedCode: ruleMap.get(relation.accountReducedCode)?.costCenterReducedCode || "",
      }));

      const nextMap = new Map<string, SpedRelationship>();
      generated.forEach(relation => nextMap.set(relationshipKey(relation.accountReducedCode, relation.costCenterReducedCode), relation));
      // Uma correção manual sempre vence a sugestão automática.
      relationships.filter(relation => relation.source === "manual").forEach(relation => nextMap.set(relationshipKey(relation.accountReducedCode, relation.costCenterReducedCode), relation));
      const next = Array.from(nextMap.values());

      setRelationships(next);
      await saveWorkspaceData(relationshipsKey, next);
      setMappingSummary(`${result.deterministicCount} conta(s) ligadas por regra forte, ${result.aiCount} pela IA e ${result.unresolved.length} ficaram para revisão.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível gerar o relacionamento automático.");
    } finally {
      setMapping(false);
    }
  };

  const importFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setError("");
    try {
      setPreview(await readSpedRelationshipFiles(files));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível ler os arquivos.");
    }
  };

  const confirmImport = async () => {
    if (!preview) return;
    const relationMap = new Map<string, SpedRelationship>();
    relationships.forEach(item => relationMap.set(relationshipKey(item.accountReducedCode, item.costCenterReducedCode), item));
    preview.relationships.forEach(item => relationMap.set(relationshipKey(item.accountReducedCode, item.costCenterReducedCode), item));
    relationships.filter(item => item.source === "manual").forEach(item => relationMap.set(relationshipKey(item.accountReducedCode, item.costCenterReducedCode), item));

    const refs = new Map(referentialAccounts.map(item => [item.code, item]));
    preview.referentialAccounts.forEach(item => {
      const previous = refs.get(item.code);
      refs.set(item.code, previous ? { ...previous, ...item, description: item.description || previous.description, nature: item.nature || previous.nature, analytical: item.analytical ?? previous.analytical } : item);
    });

    const nextRelations = Array.from(relationMap.values());
    const nextRefs = Array.from(refs.values());
    setRelationships(nextRelations);
    setReferentialAccounts(nextRefs);
    await Promise.all([saveWorkspaceData(relationshipsKey, nextRelations), saveWorkspaceData(referentialKey, nextRefs)]);
    setPreview(null);
  };

  const addManual = async () => {
    if (!manual.accountReducedCode || !manual.referentialCode.trim()) return;
    const relation: SpedRelationship = {
      id: `manual-${crypto.randomUUID()}`,
      accountReducedCode: manual.accountReducedCode,
      accountCode: accountMap.get(manual.accountReducedCode)?.account,
      costCenterReducedCode: manual.costCenterReducedCode,
      referentialCode: manual.referentialCode.trim(),
      source: "manual",
    };
    const key = relationshipKey(relation.accountReducedCode, relation.costCenterReducedCode);
    const next = [...relationships.filter(item => relationshipKey(item.accountReducedCode, item.costCenterReducedCode) !== key), relation];
    setRelationships(next);
    await saveWorkspaceData(relationshipsKey, next);
    setManual({ accountReducedCode: "", costCenterReducedCode: "", referentialCode: "" });
  };

  const removeRelationship = async (id: string) => {
    const next = relationships.filter(item => item.id !== id);
    setRelationships(next);
    await saveWorkspaceData(relationshipsKey, next);
  };

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex flex-col gap-5 border-b border-border bg-muted/20 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-cyan-600" /><h2 className="text-lg font-semibold">Ponte automática com a Receita</h2></div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">A fonte agora é o <strong className="text-foreground">Plano de Contas do próprio site</strong>. O sistema identifica o grupo da conta, limita as opções ao grupo compatível do Plano Referencial e usa IA apenas quando a equivalência não é óbvia.</p>
        </div>
        <Button size="lg" onClick={() => void generateBridge()} disabled={mapping || !accounts.length}>
          {mapping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {mapping ? "Relacionando contas..." : "Gerar relacionamento automaticamente"}
        </Button>
      </div>

      <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Contas analíticas" value={String(analyticalAccounts.length)} />
        <Metric label="Base referencial" value={referentialAccounts.length ? `${referentialAccounts.length} contas` : "não carregada"} />
        <Metric label="Relacionadas" value={String(relationshipMap.size)} tone={relationshipMap.size ? "ok" : "neutral"} />
        <Metric label="Pendentes" value={String(unmappedCount)} tone={unmappedCount ? "warning" : "ok"} />
      </div>
    </section>

    {planProfile.detected ? <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3 text-sm">
      <strong className="text-emerald-700 dark:text-emerald-300">Estrutura reconhecida:</strong> 1 Ativo · 2 Passivo · 3 Receita · 4 Despesa · 6 Resultado. Isso impede a IA de comparar uma conta com o grupo errado.
    </div> : accounts.length > 0 && <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-800 dark:text-amber-200">A estrutura 1/2/3/4/6 não foi reconhecida com segurança; a automação fica bloqueada.</div>}

    {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}
    {mappingSummary && <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/[0.05] px-4 py-3 text-sm text-cyan-800 dark:text-cyan-200"><BrainCircuit className="mr-2 inline h-4 w-4" />{mappingSummary}</div>}

    {relationships.length > 0 && validation.criticalGroups === 0 ? <section className="rounded-xl border-2 border-emerald-500/35 bg-emerald-500/[0.05] p-5"><div className="flex gap-3"><CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" /><div><p className="font-semibold">Relacionamento estruturalmente coerente</p><p className="mt-1 text-sm text-muted-foreground">{validation.validRelationships} vínculo(s) passaram pelas validações disponíveis. As contas com confiança baixa continuam visíveis na tabela para revisão.</p></div></div></section>
    : validation.criticalGroups > 0 && <section className="rounded-xl border-2 border-red-500/45 bg-red-500/[0.06] p-5"><div className="flex gap-3"><AlertTriangle className="h-6 w-6 shrink-0 text-red-600" /><div><p className="font-semibold">Encontramos {validation.criticalGroups} causa(s) importante(s)</p><p className="mt-1 text-sm text-muted-foreground">Não significa que existam dezenas de erros independentes. Corrija a causa estrutural primeiro.</p></div></div></section>}

    <section className="rounded-xl border border-border bg-background">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="font-semibold">Plano do site → Plano da Receita</h3><p className="mt-1 text-xs text-muted-foreground">Esta é a planilha da ponte. O centro de custo vem automaticamente da aba Centros de Custo.</p></div>
        <Input className="max-w-sm" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar conta, C.R. ou descrição" />
      </div>
      <div className="max-h-[640px] overflow-auto"><table className="w-full min-w-[1120px] text-xs"><thead className="sticky top-0 z-10 bg-muted/95 text-left text-[11px] text-muted-foreground"><tr><th className="border-b border-r border-border px-3 py-2">Conta</th><th className="border-b border-r border-border px-3 py-2">C.R.</th><th className="border-b border-r border-border px-3 py-2">Grupo</th><th className="border-b border-r border-border px-3 py-2">Descrição</th><th className="border-b border-r border-border px-3 py-2">Centro de custo</th><th className="border-b border-r border-border px-3 py-2">Conta referencial da Receita</th><th className="border-b border-border px-3 py-2">Status</th></tr></thead><tbody>{filteredAccounts.map(account => {
        const relation = relationshipMap.get(account.reducedCode) as GeneratedSpedRelationship | undefined;
        const reference = relation ? referenceMap.get(relation.referentialCode) : null;
        const centerCode = relation?.costCenterReducedCode || ruleMap.get(account.reducedCode)?.costCenterReducedCode || "";
        const center = centerCode ? centerMap.get(centerCode) : null;
        const confidence = Number(relation?.confidence ?? (relation?.source === "manual" ? 1 : 0));
        const low = relation && relation.source !== "manual" && confidence > 0 && confidence < 0.82;
        return <tr key={account.id} className={cn("border-b border-border last:border-0", !relation ? "bg-red-500/[0.055]" : low ? "bg-amber-500/[0.06]" : "bg-emerald-500/[0.035]")}><td className="border-r border-border px-3 py-2 font-mono">{account.account}</td><td className="border-r border-border px-3 py-2 tabular-nums">{account.reducedCode}</td><td className="border-r border-border px-3 py-2">{groupLabel(groupFromAccountCode(account.account))}</td><td className="border-r border-border px-3 py-2">{account.description}</td><td className="border-r border-border px-3 py-2">{center ? `${center.reducedCode} · ${center.description}` : "—"}</td><td className="border-r border-border px-3 py-2">{relation ? <><span className="font-mono">{relation.referentialCode}</span><span className="ml-2 text-muted-foreground">{reference?.description ?? ""}</span></> : <span className="text-red-600">Pendente</span>}</td><td className="px-3 py-2">{!relation ? <span className="font-semibold text-red-600">Sem vínculo</span> : relation.source === "manual" ? <span className="font-semibold text-cyan-700 dark:text-cyan-300">Manual</span> : low ? <span className="font-semibold text-amber-700 dark:text-amber-300">Revisar · {Math.round(confidence * 100)}%</span> : <span className="font-semibold text-emerald-700 dark:text-emerald-300">Automático · {confidence ? `${Math.round(confidence * 100)}%` : "OK"}</span>}</td></tr>;
      })}{!filteredAccounts.length && <tr><td colSpan={7} className="h-36 text-center text-muted-foreground">Nenhuma conta analítica encontrada.</td></tr>}</tbody></table></div>
      {analyticalAccounts.length > filteredAccounts.length && <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">Mostrando até 350 linhas. Use a busca para localizar uma conta específica.</div>}
    </section>

    {validation.groups.length > 0 && <section className="rounded-xl border border-border bg-background"><div className="border-b border-border p-5"><h3 className="font-semibold">Problemas estruturais encontrados</h3><p className="mt-1 text-xs text-muted-foreground">Agrupados por causa para não transformar um erro em dezenas de críticas repetidas.</p></div><div className="divide-y divide-border">{validation.groups.map(group => <details key={group.id} className="p-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-3"><div className="flex items-center gap-3">{group.severity === "critical" ? <AlertTriangle className="h-4 w-4 text-red-600" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}<div><p className="text-sm font-medium">{group.title}</p><p className="mt-1 text-xs text-muted-foreground">{group.message}</p></div></div><span className="rounded-full bg-muted px-2.5 py-1 text-[10px]">{group.impactedCount} conta(s)</span></summary><div className="mt-3 flex flex-wrap gap-1.5 pl-7">{group.impactedReducedCodes.slice(0, 80).map(code => <span key={code} className="rounded border border-border px-2 py-1 text-[10px]">C.R. {code}</span>)}</div></details>)}</div></section>}

    <details className="rounded-xl border border-border bg-background">
      <summary className="flex cursor-pointer list-none items-center justify-between p-5"><div className="flex items-center gap-3"><Settings2 className="h-5 w-5 text-muted-foreground" /><div><h3 className="font-semibold">Configurações avançadas</h3><p className="mt-1 text-xs text-muted-foreground">Importação do Calima fica apenas como migração/comparação. O fluxo normal não depende dela.</p></div></div><ChevronDown className="h-4 w-4" /></summary>
      <div className="space-y-6 border-t border-border p-5">
        <section className="rounded-lg border border-border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h4 className="text-sm font-semibold">Importar relacionamento antigo</h4><p className="mt-1 text-xs text-muted-foreground">Opcional: use arquivos do Calima apenas para comparar ou aproveitar vínculos antigos.</p></div><Button variant="outline" onClick={() => inputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Importar arquivos</Button></div>
          <input ref={inputRef} multiple type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={event => void importFiles(event)} />
          {preview && <div className="mt-4 rounded-md bg-cyan-500/[0.05] p-4"><p className="text-sm font-medium">{preview.relationships.length} vínculo(s) e {preview.referentialAccounts.length} conta(s) referenciais reconhecidos.</p><div className="mt-3 flex gap-2"><Button variant="outline" size="sm" onClick={() => setPreview(null)}>Cancelar</Button><Button size="sm" onClick={() => void confirmImport()}>Adicionar à base</Button></div></div>}
        </section>

        <section><h4 className="text-sm font-semibold">Corrigir vínculo manualmente</h4><div className="mt-3 grid gap-3 lg:grid-cols-[minmax(260px,1.4fr)_minmax(200px,1fr)_minmax(220px,1fr)_auto]">
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={manual.accountReducedCode} onChange={event => setManual(value => ({ ...value, accountReducedCode: event.target.value, costCenterReducedCode: ruleMap.get(event.target.value)?.costCenterReducedCode || "" }))}><option value="">Escolha a conta...</option>{analyticalAccounts.map(account => <option key={account.id} value={account.reducedCode}>{account.reducedCode} · {account.description}</option>)}</select>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={manual.costCenterReducedCode} onChange={event => setManual(value => ({ ...value, costCenterReducedCode: event.target.value }))}><option value="">Sem centro de custo</option>{centers.filter(center => center.analytical).map(center => <option key={center.id} value={center.reducedCode}>{center.reducedCode} · {center.description}</option>)}</select>
          <Input list="sped-reference-list" placeholder="Código referencial" value={manual.referentialCode} onChange={event => setManual(value => ({ ...value, referentialCode: event.target.value }))} />
          <Button disabled={!manual.accountReducedCode || !manual.referentialCode.trim()} onClick={() => void addManual()}><Link2 className="mr-2 h-4 w-4" />Salvar</Button>
          <datalist id="sped-reference-list">{referentialAccounts.filter(account => account.analytical !== false).map(account => <option key={account.code} value={account.code}>{account.description}</option>)}</datalist>
        </div></section>

        {relationships.length > 0 && <section><h4 className="mb-3 text-sm font-semibold">Vínculos salvos</h4><div className="max-h-72 overflow-auto rounded-md border border-border"><table className="w-full min-w-[760px] text-xs"><thead className="sticky top-0 bg-muted/95"><tr><th className="px-3 py-2 text-left">C.R.</th><th className="px-3 py-2 text-left">Conta</th><th className="px-3 py-2 text-left">C.C.</th><th className="px-3 py-2 text-left">Referencial</th><th className="w-12" /></tr></thead><tbody>{relationships.map(relation => <tr key={relation.id} className="border-t border-border"><td className="px-3 py-2">{relation.accountReducedCode}</td><td className="px-3 py-2">{accountMap.get(relation.accountReducedCode)?.description ?? relation.accountCode ?? "—"}</td><td className="px-3 py-2">{relation.costCenterReducedCode || "—"}</td><td className="px-3 py-2">{relation.referentialCode}</td><td className="px-2"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void removeRelationship(relation.id)}><Trash2 className="h-3.5 w-3.5" /></Button></td></tr>)}</tbody></table></div></section>}
      </div>
    </details>
  </div>;
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "ok" | "warning" }) {
  return <div className="bg-background p-4"><p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p><p className={cn("mt-1 text-lg font-semibold", tone === "ok" && "text-emerald-600", tone === "warning" && "text-amber-600")}>{value}</p></div>;
}
