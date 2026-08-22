import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ChartAccount } from "@/lib/lancamentos/chartOfAccounts";
import { AccountCostCenterRule, CostCenter, readCostCenters, suggestCostCenterForAccount } from "@/lib/lancamentos/costCenters";
import { loadWorkspaceData, saveWorkspaceData } from "@/lib/lancamentos/workspaceStorage";

export function CostCentersWorkspace({ company }: { company: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [centers, setCenters] = useState<CostCenter[]>([]);
  const [preview, setPreview] = useState<CostCenter[]>([]);
  const [rules, setRules] = useState<AccountCostCenterRule[]>([]);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
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
    ]).then(([savedCenters, savedRules, savedAccounts]) => {
      if (!active) return;
      setCenters(savedCenters ?? []);
      setRules(savedRules ?? []);
      setAccounts(savedAccounts ?? []);
    });
    return () => { active = false; };
  }, [accountsKey, centersKey, rulesKey]);

  const analyticalAccounts = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return accounts.filter(account => account.analytical).filter(account => !term || `${account.account} ${account.reducedCode} ${account.description}`.toLocaleLowerCase("pt-BR").includes(term));
  }, [accounts, query]);

  const ruleMap = useMemo(() => new Map(rules.map(rule => [rule.accountReducedCode, rule])), [rules]);

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      const parsed = await readCostCenters(file);
      if (!parsed.length) {
        setError("Nenhum centro de custo foi reconhecido. Confirme as colunas Código, C.R., Descrição e Analítica.");
        return;
      }
      setPreview(parsed);
    } catch {
      setError("Não foi possível abrir o arquivo. Use XLSX, XLS ou CSV exportado pelo Calima.");
    }
  };

  const confirmImport = async () => {
    const next = Array.from(new Map(preview.map(center => [center.reducedCode || center.code, center])).values());
    await saveWorkspaceData(centersKey, next);
    setCenters(next);
    setPreview([]);

    // Só sugere C.C. para contas de resultado. Patrimoniais permanecem sem centro.
    const existing = new Map(rules.map(rule => [rule.accountReducedCode, rule]));
    accounts.filter(account => account.analytical).forEach(account => {
      if (existing.has(account.reducedCode)) return;
      const suggested = suggestCostCenterForAccount(account, next);
      if (!suggested) return;
      existing.set(account.reducedCode, {
        accountReducedCode: account.reducedCode,
        costCenterReducedCode: suggested.reducedCode,
        required: true,
      });
    });
    const nextRules = Array.from(existing.values());
    setRules(nextRules);
    await saveWorkspaceData(rulesKey, nextRules);
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
    const next = [...centers.filter(item => item.reducedCode !== center.reducedCode), center];
    setCenters(next);
    await saveWorkspaceData(centersKey, next);
    setNewCenter({ code: "", reducedCode: "", description: "", analytical: true });
  };

  const removeCenter = async (center: CostCenter) => {
    const next = centers.filter(item => item.id !== center.id);
    const nextRules = rules.filter(rule => rule.costCenterReducedCode !== center.reducedCode);
    setCenters(next);
    setRules(nextRules);
    await Promise.all([saveWorkspaceData(centersKey, next), saveWorkspaceData(rulesKey, nextRules)]);
  };

  const updateRule = async (account: ChartAccount, costCenterReducedCode: string, required?: boolean) => {
    const current = ruleMap.get(account.reducedCode);
    const next = rules.filter(rule => rule.accountReducedCode !== account.reducedCode);
    if (costCenterReducedCode) {
      next.push({
        accountReducedCode: account.reducedCode,
        costCenterReducedCode,
        required: required ?? current?.required ?? true,
      });
    }
    setRules(next);
    await saveWorkspaceData(rulesKey, next);
  };

  const updateRequired = async (account: ChartAccount, required: boolean) => {
    const current = ruleMap.get(account.reducedCode);
    if (!current) return;
    const next = rules.map(rule => rule.accountReducedCode === account.reducedCode ? { ...rule, required } : rule);
    setRules(next);
    await saveWorkspaceData(rulesKey, next);
  };

  return <div className="space-y-6">
    <section className="rounded-md border border-border bg-background p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold">Centros de custo</h2>
          <p className="mt-1 text-sm text-muted-foreground">Importe o cadastro do Calima com o mesmo fluxo do Plano de Contas. Conta analítica não implica C.C. obrigatório; a exigência é configurada por conta.</p>
        </div>
        <Button variant="outline" onClick={() => inputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Importar centros de custo</Button>
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={event => void importFile(event)} />
      </div>
      {error && <div className="mt-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      {preview.length > 0 && <div className="mt-4 overflow-hidden rounded-md border border-border">
        <div className="flex items-center justify-between border-b border-border p-4"><span className="text-sm">Prévia · {preview.length} centro(s)</span><div className="flex gap-2"><Button variant="outline" onClick={() => setPreview([])}>Cancelar</Button><Button onClick={() => void confirmImport()}>Confirmar importação</Button></div></div>
        <CostCenterTable centers={preview.slice(0, 8)} />
      </div>}
    </section>

    <section className="rounded-md border border-border bg-background">
      <div className="grid gap-3 border-b border-border p-4 md:grid-cols-[120px_120px_minmax(220px,1fr)_auto]">
        <Input placeholder="Código" value={newCenter.code} onChange={event => setNewCenter(value => ({ ...value, code: event.target.value }))} />
        <Input placeholder="C.R." value={newCenter.reducedCode} onChange={event => setNewCenter(value => ({ ...value, reducedCode: event.target.value }))} />
        <Input placeholder="Descrição" value={newCenter.description} onChange={event => setNewCenter(value => ({ ...value, description: event.target.value }))} />
        <Button onClick={() => void addCenter()} disabled={!newCenter.code.trim() || !newCenter.description.trim()}><Plus className="mr-2 h-4 w-4" />Adicionar</Button>
      </div>
      <CostCenterTable centers={centers} onRemove={removeCenter} />
      <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">{centers.length} centro(s) de custo vinculados a esta empresa</div>
    </section>

    <section className="rounded-md border border-border bg-background">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="text-sm font-semibold">Vinculação às contas analíticas</h3><p className="mt-1 text-xs text-muted-foreground">Defina o C.C. padrão apenas nas contas que realmente exigem rateio. O site usa essa configuração nas exportações e nos ajustes do Balancete.</p></div>
        <Input className="max-w-sm" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar conta, C.R. ou descrição" />
      </div>
      <div className="max-h-[560px] overflow-auto"><table className="w-full min-w-[920px] text-sm"><thead className="sticky top-0 z-10 bg-muted/95 text-left text-xs text-muted-foreground"><tr><th className="border-b border-r border-border px-3 py-2">Conta</th><th className="border-b border-r border-border px-3 py-2">C.R.</th><th className="border-b border-r border-border px-3 py-2">Descrição</th><th className="border-b border-r border-border px-3 py-2">Centro de custo padrão</th><th className="border-b border-border px-3 py-2 text-center">Obrigatório</th></tr></thead><tbody>{analyticalAccounts.map(account => {
        const rule = ruleMap.get(account.reducedCode);
        return <tr key={account.id} className="border-b border-border last:border-0"><td className="border-r border-border px-3 py-2 font-mono text-xs">{account.account}</td><td className="border-r border-border px-3 py-2 tabular-nums">{account.reducedCode}</td><td className="border-r border-border px-3 py-2">{account.description}</td><td className="border-r border-border px-3 py-2"><select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={rule?.costCenterReducedCode ?? ""} onChange={event => void updateRule(account, event.target.value)}><option value="">Não usar centro de custo</option>{centers.filter(center => center.analytical).map(center => <option key={center.id} value={center.reducedCode}>{center.reducedCode} · {center.description}</option>)}</select></td><td className="px-3 py-2 text-center"><Checkbox checked={Boolean(rule?.required)} disabled={!rule?.costCenterReducedCode} onCheckedChange={checked => void updateRequired(account, checked === true)} /></td></tr>;
      })}{!analyticalAccounts.length && <tr><td colSpan={5} className="h-40 text-center text-muted-foreground">Importe primeiro o plano de contas desta empresa.</td></tr>}</tbody></table></div>
    </section>
  </div>;
}

function CostCenterTable({ centers, onRemove }: { centers: CostCenter[]; onRemove?: (center: CostCenter) => void | Promise<void> }) {
  return <div className="overflow-auto"><table className="w-full min-w-[650px] text-sm"><thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="border-b border-r border-border px-3 py-2">Código</th><th className="border-b border-r border-border px-3 py-2">C.R.</th><th className="border-b border-r border-border px-3 py-2">Descrição</th><th className="border-b border-r border-border px-3 py-2">Analítica</th>{onRemove && <th className="w-12 border-b border-border px-3 py-2" />}</tr></thead><tbody>{centers.map(center => <tr key={center.id} className="border-b border-border last:border-0"><td className="border-r border-border px-3 py-2">{center.code}</td><td className="border-r border-border px-3 py-2">{center.reducedCode}</td><td className="border-r border-border px-3 py-2">{center.description}</td><td className="border-r border-border px-3 py-2">{center.analytical ? "Sim" : "Não"}</td>{onRemove && <td className="px-2 py-1.5"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void onRemove(center)}><Trash2 className="h-4 w-4" /></Button></td>}</tr>)}{!centers.length && <tr><td colSpan={onRemove ? 5 : 4} className="h-32 text-center text-muted-foreground">Nenhum centro de custo cadastrado.</td></tr>}</tbody></table></div>;
}
