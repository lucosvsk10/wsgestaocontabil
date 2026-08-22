import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { ChartAccount } from "@/lib/lancamentos/chartOfAccounts";
import { groupFromAccountCode, groupLabel } from "@/lib/lancamentos/accountPlanProfile";
import { AccountCostCenterRule, buildAutomaticCostCenterRules, CostCenter, readCostCenters } from "@/lib/lancamentos/costCenters";
import { loadWorkspaceData, saveWorkspaceData } from "@/lib/lancamentos/workspaceStorage";

export function CostCentersWorkspace({ company }: { company: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [centers, setCenters] = useState<CostCenter[]>([]);
  const [preview, setPreview] = useState<CostCenter[]>([]);
  const [rules, setRules] = useState<AccountCostCenterRule[]>([]);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);
  const [lastSummary, setLastSummary] = useState<string | null>(null);
  const [newCenter, setNewCenter] = useState({ code: "", reducedCode: "", description: "", analytical: true });

  const centersKey = `${company}:cost-centers`;
  const rulesKey = `${company}:account-cost-center-rules`;
  const accountsKey = `${company}:chart-of-accounts`;

  useEffect(() => {
    let active = true;
    void Promise.all([
      loadWorkspaceData<CostCenter[]>(centersKey),
      loadWorkspaceData<AccountCostCenterRule[]>(rulesKey),
      loadWorkspaceData<ChartAccount[]>(accountsKey),
    ]).then(async ([savedCenters, savedRules, savedAccounts]) => {
      if (!active) return;
      const nextCenters = savedCenters ?? [];
      const nextAccounts = savedAccounts ?? [];
      const currentRules = savedRules ?? [];
      const nextRules = buildAutomaticCostCenterRules(nextAccounts, nextCenters, currentRules);

      setCenters(nextCenters);
      setAccounts(nextAccounts);
      setRules(nextRules);

      // A vinculação automática precisa existir sem depender de clique do usuário.
      if (JSON.stringify(nextRules) !== JSON.stringify(currentRules)) {
        await saveWorkspaceData(rulesKey, nextRules);
      }
    });
    return () => { active = false; };
  }, [accountsKey, centersKey, rulesKey]);

  const analyticalAccounts = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return accounts
      .filter(account => account.analytical && account.reducedCode)
      .filter(account => !term || `${account.account} ${account.reducedCode} ${account.description}`.toLocaleLowerCase("pt-BR").includes(term));
  }, [accounts, query]);

  const ruleMap = useMemo(() => new Map(rules.map(rule => [rule.accountReducedCode, rule])), [rules]);
  const automaticRules = rules.filter(rule => rule.source === "automatic");

  const summarizeRules = (items: AccountCostCenterRule[]) => {
    const auto = items.filter(rule => rule.source === "automatic");
    const counts = new Map<string, number>();
    auto.forEach(rule => counts.set(rule.costCenterReducedCode, (counts.get(rule.costCenterReducedCode) ?? 0) + 1));
    const detail = Array.from(counts.entries()).map(([code, count]) => `C.C. ${code}: ${count}`).join(" · ");
    return `${auto.length} vínculos automáticos preenchidos${detail ? ` — ${detail}` : ""}.`;
  };

  const applyAutomaticRules = async (nextCenters = centers, nextAccounts = accounts, currentRules = rules) => {
    setError("");
    setApplying(true);
    try {
      if (!nextAccounts.length) throw new Error("Importe primeiro o Plano de Contas da empresa.");
      if (!nextCenters.length) throw new Error("Cadastre ou importe os centros de custo antes de vincular as contas.");

      const nextRules = buildAutomaticCostCenterRules(nextAccounts, nextCenters, currentRules);
      const saveResult = await saveWorkspaceData(rulesKey, nextRules);
      setRules(nextRules);
      if (!saveResult.synced) throw new Error(saveResult.error || "Os vínculos não foram sincronizados com o banco.");

      const summary = summarizeRules(nextRules);
      setLastSummary(summary);
      toast({ title: "Vinculações atualizadas", description: summary });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Não foi possível preencher os centros de custo.";
      setError(message);
      toast({ title: "Falha ao vincular centros de custo", description: message, variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      const parsed = await readCostCenters(file);
      if (!parsed.length) throw new Error("Nenhum centro de custo foi reconhecido. Confirme as colunas Código, C.R., Descrição e Analítica.");
      setPreview(parsed);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível abrir o arquivo.");
    }
  };

  const confirmImport = async () => {
    const nextCenters = Array.from(new Map(preview.map(center => [center.reducedCode || center.code, center])).values());
    await saveWorkspaceData(centersKey, nextCenters);
    setCenters(nextCenters);
    setPreview([]);
    await applyAutomaticRules(nextCenters, accounts, rules);
  };

  const addCenter = async () => {
    if (!newCenter.code.trim() || !newCenter.description.trim()) return;
    const center: CostCenter = {
      id: `manual-${crypto.randomUUID()}`,
      code: newCenter.code.trim(),
      reducedCode: newCenter.reducedCode.trim() || newCenter.code.trim(),
      description: newCenter.description.trim(),
      analytical: newCenter.analytical,
    };
    const nextCenters = [...centers.filter(item => item.reducedCode !== center.reducedCode), center];
    setCenters(nextCenters);
    await saveWorkspaceData(centersKey, nextCenters);
    setNewCenter({ code: "", reducedCode: "", description: "", analytical: true });
    await applyAutomaticRules(nextCenters, accounts, rules);
  };

  const removeCenter = async (center: CostCenter) => {
    const nextCenters = centers.filter(item => item.id !== center.id);
    const nextRules = rules.filter(rule => rule.costCenterReducedCode !== center.reducedCode);
    setCenters(nextCenters);
    setRules(nextRules);
    await Promise.all([saveWorkspaceData(centersKey, nextCenters), saveWorkspaceData(rulesKey, nextRules)]);
  };

  const updateRule = async (account: ChartAccount, costCenterReducedCode: string) => {
    const current = ruleMap.get(account.reducedCode);
    const next = rules.filter(rule => rule.accountReducedCode !== account.reducedCode);
    if (costCenterReducedCode) {
      next.push({
        accountReducedCode: account.reducedCode,
        costCenterReducedCode,
        required: current?.required ?? true,
        source: "manual",
      });
    }
    setRules(next);
    await saveWorkspaceData(rulesKey, next);
  };

  const updateRequired = async (account: ChartAccount, required: boolean) => {
    const current = ruleMap.get(account.reducedCode);
    if (!current) return;
    const next = rules.map(rule => rule.accountReducedCode === account.reducedCode ? { ...rule, required, source: "manual" as const } : rule);
    setRules(next);
    await saveWorkspaceData(rulesKey, next);
  };

  return <div className="space-y-6">
    <section className="rounded-xl border border-border bg-background p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold">Centros de custo</h2>
          <p className="mt-1 text-sm text-muted-foreground">Ao abrir esta aba, o sistema já vincula automaticamente as contas analíticas aos centros compatíveis.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void applyAutomaticRules()} disabled={applying || !accounts.length}>
            {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {applying ? "Atualizando..." : "Atualizar vínculos"}
          </Button>
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Importar centros de custo</Button>
        </div>
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={event => void importFile(event)} />
      </div>

      {automaticRules.length > 0 && !lastSummary && <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3 text-sm"><CheckCircle2 className="mr-2 inline h-4 w-4 text-emerald-600" /><strong>{automaticRules.length}</strong> contas já foram preenchidas automaticamente.</div>}
      {lastSummary && <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3 text-sm"><CheckCircle2 className="mr-2 inline h-4 w-4 text-emerald-600" />{lastSummary}</div>}
      {error && <div className="mt-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      {preview.length > 0 && <div className="mt-4 overflow-hidden rounded-md border border-border">
        <div className="flex items-center justify-between border-b border-border p-4"><span className="text-sm">Prévia · {preview.length} centro(s)</span><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setPreview([])}>Cancelar</Button><Button type="button" onClick={() => void confirmImport()}>Confirmar</Button></div></div>
        <CostCenterTable centers={preview.slice(0, 8)} />
      </div>}
    </section>

    <section className="rounded-md border border-border bg-background">
      <div className="grid gap-3 border-b border-border p-4 md:grid-cols-[120px_120px_minmax(220px,1fr)_auto]">
        <Input placeholder="Código" value={newCenter.code} onChange={event => setNewCenter(value => ({ ...value, code: event.target.value }))} />
        <Input placeholder="C.R." value={newCenter.reducedCode} onChange={event => setNewCenter(value => ({ ...value, reducedCode: event.target.value }))} />
        <Input placeholder="Descrição" value={newCenter.description} onChange={event => setNewCenter(value => ({ ...value, description: event.target.value }))} />
        <Button type="button" onClick={() => void addCenter()} disabled={!newCenter.code.trim() || !newCenter.description.trim()}><Plus className="mr-2 h-4 w-4" />Adicionar</Button>
      </div>
      <CostCenterTable centers={centers} onRemove={removeCenter} />
      <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">{centers.length} centro(s) cadastrados</div>
    </section>

    <section className="rounded-md border border-border bg-background">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="text-sm font-semibold">Vinculação às contas analíticas</h3><p className="mt-1 text-xs text-muted-foreground">Preenchida automaticamente. Qualquer ajuste feito aqui passa a ter prioridade.</p></div>
        <Input className="max-w-sm" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar conta, C.R. ou descrição" />
      </div>
      <div className="max-h-[560px] overflow-auto"><table className="w-full min-w-[980px] text-sm"><thead className="sticky top-0 z-10 bg-muted/95 text-left text-xs text-muted-foreground"><tr><th className="border-b border-r border-border px-3 py-2">Conta</th><th className="border-b border-r border-border px-3 py-2">Grupo</th><th className="border-b border-r border-border px-3 py-2">C.R.</th><th className="border-b border-r border-border px-3 py-2">Descrição</th><th className="border-b border-r border-border px-3 py-2">Centro de custo</th><th className="border-b border-border px-3 py-2 text-center">Obrigatório</th></tr></thead><tbody>{analyticalAccounts.map(account => {
        const rule = ruleMap.get(account.reducedCode);
        return <tr key={account.id} className="border-b border-border last:border-0"><td className="border-r border-border px-3 py-2 font-mono text-xs">{account.account}</td><td className="border-r border-border px-3 py-2 text-xs">{groupLabel(groupFromAccountCode(account.account))}</td><td className="border-r border-border px-3 py-2 tabular-nums">{account.reducedCode}</td><td className="border-r border-border px-3 py-2">{account.description}</td><td className="border-r border-border px-3 py-2"><select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={rule?.costCenterReducedCode ?? ""} onChange={event => void updateRule(account, event.target.value)}><option value="">Sem centro de custo</option>{centers.filter(center => center.analytical).map(center => <option key={center.id} value={center.reducedCode}>{center.reducedCode} · {center.description}</option>)}</select>{rule?.source === "automatic" && <span className="mt-1 block text-[10px] text-emerald-700 dark:text-emerald-300">Automático</span>}</td><td className="px-3 py-2 text-center"><Checkbox checked={Boolean(rule?.required)} disabled={!rule?.costCenterReducedCode} onCheckedChange={checked => void updateRequired(account, checked === true)} /></td></tr>;
      })}{!analyticalAccounts.length && <tr><td colSpan={6} className="h-40 text-center text-muted-foreground">Importe primeiro o Plano de Contas da empresa.</td></tr>}</tbody></table></div>
    </section>
  </div>;
}

function CostCenterTable({ centers, onRemove }: { centers: CostCenter[]; onRemove?: (center: CostCenter) => void | Promise<void> }) {
  return <div className="overflow-auto"><table className="w-full min-w-[650px] text-sm"><thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="border-b border-r border-border px-3 py-2">Código</th><th className="border-b border-r border-border px-3 py-2">C.R.</th><th className="border-b border-r border-border px-3 py-2">Descrição</th><th className="border-b border-r border-border px-3 py-2">Tipo</th>{onRemove && <th className="border-b border-border px-3 py-2 text-right">Ações</th>}</tr></thead><tbody>{centers.map(center => <tr key={center.id} className="border-b border-border last:border-0"><td className="border-r border-border px-3 py-2 font-mono text-xs">{center.code}</td><td className="border-r border-border px-3 py-2 tabular-nums">{center.reducedCode}</td><td className="border-r border-border px-3 py-2">{center.description}</td><td className="border-r border-border px-3 py-2 text-xs">{center.analytical ? "Analítico" : "Sintético"}</td>{onRemove && <td className="px-3 py-2 text-right"><Button type="button" variant="ghost" size="icon" onClick={() => void onRemove(center)}><Trash2 className="h-4 w-4" /></Button></td>}</tr>)}{!centers.length && <tr><td colSpan={onRemove ? 5 : 4} className="h-28 text-center text-muted-foreground">Nenhum centro de custo cadastrado.</td></tr>}</tbody></table></div>;
}
