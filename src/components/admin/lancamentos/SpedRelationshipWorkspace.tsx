import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Link2, ShieldCheck, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChartAccount } from "@/lib/lancamentos/chartOfAccounts";
import { AccountCostCenterRule, CostCenter } from "@/lib/lancamentos/costCenters";
import {
  readSpedRelationships,
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
  const [query, setQuery] = useState("");
  const [onlySped, setOnlySped] = useState(true);
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

  const impacted = useMemo(() => {
    const map = new Map<string, { critical: boolean; messages: string[] }>();
    validation.groups.forEach(group => {
      group.impactedReducedCodes.forEach(code => {
        const current = map.get(code) ?? { critical: false, messages: [] };
        current.critical ||= group.severity === "critical";
        current.messages.push(group.title);
        map.set(code, current);
      });
    });
    return map;
  }, [validation]);

  const filteredAccounts = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return accounts
      .filter(account => account.analytical)
      .filter(account => !onlySped || account.sped)
      .filter(account => !term || `${account.account} ${account.reducedCode} ${account.description}`.toLocaleLowerCase("pt-BR").includes(term))
      .slice(0, 250);
  }, [accounts, onlySped, query]);

  const accountMap = useMemo(() => new Map(accounts.map(account => [account.reducedCode, account])), [accounts]);
  const centerMap = useMemo(() => new Map(centers.map(center => [center.reducedCode, center])), [centers]);
  const referentialMap = useMemo(() => new Map(referentialAccounts.map(account => [account.code, account])), [referentialAccounts]);

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      const result = await readSpedRelationships(file);
      setPreview(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível ler o arquivo de relacionamento SPED.");
    }
  };

  const confirmImport = async () => {
    if (!preview) return;
    const nextRelationships = preview.relationships;
    const nextReferential = Array.from(new Map(preview.referentialAccounts.map(account => [account.code, account])).values());
    setRelationships(nextRelationships);
    setReferentialAccounts(nextReferential);
    await Promise.all([
      saveWorkspaceData(relationshipsKey, nextRelationships),
      saveWorkspaceData(referentialKey, nextReferential),
    ]);
    setPreview(null);
  };

  const addManual = async () => {
    if (!manual.accountReducedCode || !manual.referentialCode) return;
    const nextRelation: SpedRelationship = {
      id: `manual-${crypto.randomUUID()}`,
      accountReducedCode: manual.accountReducedCode,
      costCenterReducedCode: manual.costCenterReducedCode,
      referentialCode: manual.referentialCode.trim(),
      source: "manual",
    };
    const key = relationshipKey(nextRelation.accountReducedCode, nextRelation.costCenterReducedCode);
    const next = [
      ...relationships.filter(item => relationshipKey(item.accountReducedCode, item.costCenterReducedCode) !== key),
      nextRelation,
    ];
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
    <section className="rounded-md border border-border bg-background p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-cyan-600" /><h2 className="text-base font-semibold">Pré-validador de relacionamento SPED</h2></div>
          <p className="mt-2 text-sm text-muted-foreground">Valida a estrutura antes do Calima/Receita: parentesco das contas, centro de custo, vínculo referencial, natureza e unicidade Conta + C.C. → Conta Referencial. Críticas iguais são agrupadas por causa raiz.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => inputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Importar relacionamento do Calima</Button>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={event => void importFile(event)} />
        </div>
      </div>
      {error && <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}
    </section>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Causas críticas" value={String(validation.criticalGroups)} tone={validation.criticalGroups ? "critical" : "ok"} />
      <Metric label="Avisos agrupados" value={String(validation.warningGroups)} tone={validation.warningGroups ? "warning" : "ok"} />
      <Metric label="Contas impactadas" value={String(validation.impactedAccounts)} tone={validation.impactedAccounts ? "warning" : "ok"} />
      <Metric label="Relacionamentos válidos" value={`${validation.validRelationships}/${validation.totalRelationships}`} tone={validation.totalRelationships && validation.validRelationships === validation.totalRelationships ? "ok" : "neutral"} />
    </div>

    {preview && <section className="rounded-md border border-cyan-500/30 bg-cyan-500/[0.04] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="font-semibold">Prévia da importação</h3><p className="mt-1 text-sm text-muted-foreground">{preview.relationships.length} relacionamento(s) e {preview.referentialAccounts.length} conta(s) referencial(is) reconhecidos.</p>{preview.warnings.map(warning => <p key={warning} className="mt-1 text-xs text-amber-700 dark:text-amber-300">{warning}</p>)}</div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => setPreview(null)}>Cancelar</Button><Button onClick={() => void confirmImport()}>Confirmar importação</Button></div>
      </div>
    </section>}

    <section className="rounded-md border border-border bg-background">
      <div className="border-b border-border p-5"><h3 className="font-semibold">Causas raiz</h3><p className="mt-1 text-sm text-muted-foreground">Em vez de repetir a mesma crítica em dezenas de registros, o sistema mostra o problema estrutural e quantas contas ele pode afetar.</p></div>
      <div className="divide-y divide-border">
        {validation.groups.map(group => <details key={group.id} className="group px-5 py-4">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
            <div className="flex min-w-0 gap-3">{group.severity === "critical" ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />}<div><p className="text-sm font-semibold">{group.title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{group.message}</p></div></div>
            <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", group.severity === "critical" ? "bg-red-500/15 text-red-700 dark:text-red-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300")}>{group.impactedCount} conta(s)</span>
          </summary>
          <div className="mt-3 flex flex-wrap gap-1.5 pl-8">{group.impactedReducedCodes.slice(0, 80).map(code => <span key={code} className="rounded border border-border bg-muted/50 px-2 py-1 text-[10px]">C.R. {code}</span>)}</div>
        </details>)}
        {!validation.groups.length && <div className="flex min-h-28 items-center justify-center gap-2 p-6 text-sm text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-5 w-5" />Nenhuma inconsistência estrutural detectada nos dados disponíveis.</div>}
      </div>
    </section>

    <section className="rounded-md border border-border bg-background p-5">
      <div><h3 className="font-semibold">Adicionar relacionamento manual</h3><p className="mt-1 text-sm text-muted-foreground">Use quando precisar corrigir uma causa raiz sem reimportar o arquivo inteiro.</p></div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(260px,1.4fr)_minmax(200px,1fr)_minmax(220px,1fr)_auto]">
        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={manual.accountReducedCode} onChange={event => setManual(value => ({ ...value, accountReducedCode: event.target.value }))}><option value="">Conta analítica...</option>{accounts.filter(account => account.analytical).map(account => <option key={account.id} value={account.reducedCode}>{account.reducedCode} · {account.description}</option>)}</select>
        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={manual.costCenterReducedCode} onChange={event => setManual(value => ({ ...value, costCenterReducedCode: event.target.value }))}><option value="">Sem centro de custo</option>{centers.map(center => <option key={center.id} value={center.reducedCode}>{center.reducedCode} · {center.description}</option>)}</select>
        <Input list="sped-reference-list" placeholder="Código da conta referencial" value={manual.referentialCode} onChange={event => setManual(value => ({ ...value, referentialCode: event.target.value }))} />
        <Button disabled={!manual.accountReducedCode || !manual.referentialCode.trim()} onClick={() => void addManual()}><Link2 className="mr-2 h-4 w-4" />Vincular</Button>
        <datalist id="sped-reference-list">{referentialAccounts.map(account => <option key={account.code} value={account.code}>{account.description}</option>)}</datalist>
      </div>
    </section>

    <section className="rounded-md border border-border bg-background">
      <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
        <div><h3 className="font-semibold">Mapa Conta × Centro de Custo × Referencial</h3><p className="mt-1 text-xs text-muted-foreground">Uma combinação Conta + C.C. nunca deve apontar para mais de uma conta referencial.</p></div>
        <div className="flex flex-wrap gap-2"><Button size="sm" variant={onlySped ? "default" : "outline"} onClick={() => setOnlySped(value => !value)}>{onlySped ? "Somente marcadas SPED" : "Todas analíticas"}</Button><Input className="w-72" placeholder="Buscar conta, C.R. ou descrição" value={query} onChange={event => setQuery(event.target.value)} /></div>
      </div>
      <div className="max-h-[620px] overflow-auto"><table className="w-full min-w-[1050px] text-xs"><thead className="sticky top-0 z-10 bg-muted/95 text-left text-[11px] text-muted-foreground"><tr><th className="border-b border-r border-border px-3 py-2">Conta</th><th className="border-b border-r border-border px-3 py-2">C.R.</th><th className="border-b border-r border-border px-3 py-2">Descrição</th><th className="border-b border-r border-border px-3 py-2">C.C. padrão</th><th className="border-b border-r border-border px-3 py-2">Conta referencial</th><th className="border-b border-border px-3 py-2">Status</th></tr></thead><tbody>{filteredAccounts.map(account => {
        const relation = relationships.find(item => item.accountReducedCode === account.reducedCode);
        const status = impacted.get(account.reducedCode);
        const center = relation?.costCenterReducedCode ? centerMap.get(relation.costCenterReducedCode) : null;
        const reference = relation ? referentialMap.get(relation.referentialCode) : null;
        return <tr key={account.id} className={cn("border-b border-border last:border-0", status?.critical ? "bg-red-500/[0.10]" : status ? "bg-amber-500/[0.07]" : relation ? "bg-emerald-500/[0.06]" : "")}><td className="border-r border-border px-3 py-2 font-mono">{account.account}</td><td className="border-r border-border px-3 py-2 tabular-nums">{account.reducedCode}</td><td className="border-r border-border px-3 py-2">{account.description}</td><td className="border-r border-border px-3 py-2">{relation?.costCenterReducedCode ? `${relation.costCenterReducedCode}${center ? ` · ${center.description}` : ""}` : "—"}</td><td className="border-r border-border px-3 py-2">{relation ? <><span className="font-medium">{relation.referentialCode}</span>{reference?.description && <span className="ml-2 text-muted-foreground">{reference.description}</span>}</> : "—"}</td><td className="px-3 py-2">{status ? <span className={cn("font-medium", status.critical ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300")}>{status.messages[0]}{status.messages.length > 1 ? ` +${status.messages.length - 1}` : ""}</span> : relation ? <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" />Vínculo válido nos testes atuais</span> : <span className="text-muted-foreground">Sem relacionamento</span>}</td></tr>;
      })}{!filteredAccounts.length && <tr><td colSpan={6} className="h-40 text-center text-muted-foreground">Nenhuma conta encontrada.</td></tr>}</tbody></table></div>
    </section>

    <section className="rounded-md border border-border bg-background">
      <div className="border-b border-border p-4"><h3 className="font-semibold">Relacionamentos cadastrados</h3></div>
      <div className="overflow-auto"><table className="w-full min-w-[820px] text-xs"><thead className="bg-muted/50 text-left text-[11px] text-muted-foreground"><tr><th className="border-b border-r border-border px-3 py-2">Conta</th><th className="border-b border-r border-border px-3 py-2">Centro de custo</th><th className="border-b border-r border-border px-3 py-2">Referencial</th><th className="border-b border-r border-border px-3 py-2">Origem</th><th className="w-12 border-b border-border" /></tr></thead><tbody>{relationships.map(relation => {
        const account = accountMap.get(relation.accountReducedCode);
        const center = centerMap.get(relation.costCenterReducedCode);
        const reference = referentialMap.get(relation.referentialCode);
        return <tr key={relation.id} className="border-b border-border last:border-0"><td className="border-r border-border px-3 py-2">{relation.accountReducedCode} · {account?.description ?? relation.accountCode ?? "Conta não localizada"}</td><td className="border-r border-border px-3 py-2">{relation.costCenterReducedCode ? `${relation.costCenterReducedCode} · ${center?.description ?? "não localizado"}` : "Sem C.C."}</td><td className="border-r border-border px-3 py-2">{relation.referentialCode}{reference?.description ? ` · ${reference.description}` : ""}</td><td className="border-r border-border px-3 py-2">{relation.source === "imported" ? "Importado" : "Manual"}</td><td className="px-2 py-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void removeRelationship(relation.id)}><Trash2 className="h-4 w-4" /></Button></td></tr>;
      })}{!relationships.length && <tr><td colSpan={5} className="h-32 text-center text-muted-foreground"><FileSpreadsheet className="mx-auto mb-2 h-5 w-5" />Importe o relacionamento do Calima ou cadastre o primeiro vínculo manualmente.</td></tr>}</tbody></table></div>
    </section>
  </div>;
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "critical" | "warning" | "ok" | "neutral" }) {
  return <div className={cn("rounded-md border p-4", tone === "critical" ? "border-red-500/25 bg-red-500/[0.06]" : tone === "warning" ? "border-amber-500/25 bg-amber-500/[0.05]" : tone === "ok" ? "border-emerald-500/25 bg-emerald-500/[0.05]" : "border-border bg-background")}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p></div>;
}
