import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartAccount, readChartOfAccounts } from "@/lib/lancamentos/chartOfAccounts";
import { CostCenter, readCostCenters } from "@/lib/lancamentos/costCenters";
import { isWorkspaceDataSynced, loadWorkspaceData, saveWorkspaceData } from "@/lib/lancamentos/workspaceStorage";

export function ChartOfAccountsWorkspace({ company, companyName }: { company: string; companyName: string }) {
  const accountInput = useRef<HTMLInputElement>(null);
  const centerInput = useRef<HTMLInputElement>(null);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [preview, setPreview] = useState<ChartAccount[]>([]);
  const [query, setQuery] = useState("");
  const [fileName, setFileName] = useState("");
  const [centers, setCenters] = useState<CostCenter[]>([]);
  const [centerPreview, setCenterPreview] = useState<CostCenter[]>([]);
  const [centerQuery, setCenterQuery] = useState("");
  const [centerFileName, setCenterFileName] = useState("");
  const [newCenterCode, setNewCenterCode] = useState("");
  const [newCenterDescription, setNewCenterDescription] = useState("");
  const [error, setError] = useState("");
  const [storageStatus, setStorageStatus] = useState<"loading" | "synced" | "local" | "empty">("loading");
  const accountKey = `${company}:chart-of-accounts`;
  const centerKey = `${company}:cost-centers`;

  useEffect(() => {
    let active = true;
    setStorageStatus("loading");
    setError("");
    void (async () => {
      let saved = await loadWorkspaceData<ChartAccount[]>(accountKey);
      let synced = saved?.length ? await isWorkspaceDataSynced(accountKey) : false;
      const isLegacyEL = companyName.toUpperCase().startsWith("E L DA SILVA");
      if ((!saved || !saved.length) && isLegacyEL && company !== "el-da-silva") {
        const legacy = await loadWorkspaceData<ChartAccount[]>("el-da-silva:chart-of-accounts");
        if (legacy?.length) {
          const result = await saveWorkspaceData(accountKey, legacy);
          saved = legacy;
          synced = result.synced;
          if (!result.synced) setError("O plano antigo foi recuperado neste navegador, mas não pôde ser sincronizado com o servidor.");
        }
      }
      const savedCenters = await loadWorkspaceData<CostCenter[]>(centerKey);
      if (!active) return;
      setAccounts(saved ?? []);
      setCenters(savedCenters ?? []);
      setStorageStatus(saved?.length ? (synced ? "synced" : "local") : "empty");
    })();
    return () => { active = false; };
  }, [accountKey, centerKey, company, companyName]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? accounts.filter(account => [account.account, account.reducedCode, account.description].some(value => value.toLowerCase().includes(term))) : accounts;
  }, [accounts, query]);

  const filteredCenters = useMemo(() => {
    const term = centerQuery.trim().toLowerCase();
    return term ? centers.filter(center => [center.code, center.description].some(value => value.toLowerCase().includes(term))) : centers;
  }, [centerQuery, centers]);

  const readAccounts = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    setError("");
    try {
      const parsed = await readChartOfAccounts(file);
      if (!parsed.length) { setError("Nenhuma conta foi reconhecida. Confirme as colunas Conta, Analítica, C.R., Descrição e SPED ECD/ECF."); return; }
      setPreview(parsed); setFileName(file.name);
    } catch { setError("Não foi possível abrir o arquivo. Use XLSX, XLS ou CSV exportado pelo Calima."); }
  };

  const confirmAccounts = async () => {
    const next = Array.from(new Map(preview.map(account => [account.reducedCode || account.account, account])).values());
    const result = await saveWorkspaceData(accountKey, next);
    setAccounts(next);
    setStorageStatus(result.synced ? "synced" : "local");
    setError(result.synced ? "" : `O plano ficou salvo somente neste navegador. O servidor recusou a sincronização: ${result.error ?? "erro não informado"}`);
    setPreview([]); setFileName("");
  };

  const readCenters = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    setError("");
    try {
      const parsed = await readCostCenters(file);
      if (!parsed.length) { setError("Nenhum centro de custo foi reconhecido. O arquivo precisa ter uma coluna de Código/Centro de custo e uma coluna de Descrição/Nome."); return; }
      setCenterPreview(parsed); setCenterFileName(file.name);
    } catch { setError("Não foi possível abrir o cadastro de centros de custo. Use XLSX, XLS ou CSV exportado pelo Calima."); }
  };

  const saveCenters = async (next: CostCenter[]) => {
    const unique = Array.from(new Map(next.map(center => [center.code || center.description, center])).values());
    const result = await saveWorkspaceData(centerKey, unique);
    setCenters(unique);
    setError(result.synced ? "" : `Os centros de custo ficaram salvos somente neste navegador: ${result.error ?? "erro não informado"}`);
    return result;
  };

  const confirmCenters = async () => {
    await saveCenters([...centers, ...centerPreview]);
    setCenterPreview([]); setCenterFileName("");
  };

  const addCenter = async () => {
    const code = newCenterCode.trim();
    const description = newCenterDescription.trim();
    if (!code) { setError("Informe o código do centro de custo."); return; }
    await saveCenters([...centers.filter(center => center.code !== code), { id: crypto.randomUUID(), code, description, active: true, source: "manual" }]);
    setNewCenterCode(""); setNewCenterDescription("");
  };

  const statusText = storageStatus === "loading" ? "Verificando armazenamento..." : storageStatus === "synced" ? "Sincronizado com o servidor" : storageStatus === "local" ? "Salvo apenas neste navegador" : "Nenhum plano salvo";

  return <Tabs defaultValue="accounts" className="space-y-5">
    <TabsList className="h-9"><TabsTrigger value="accounts" className="text-xs">Plano de contas</TabsTrigger><TabsTrigger value="cost-centers" className="text-xs">Centros de custo</TabsTrigger></TabsList>
    {error && <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

    <TabsContent value="accounts" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex w-full max-w-md flex-col gap-1"><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar conta, C.R. ou descrição"/><span className="text-xs text-muted-foreground">{statusText}</span></div><label className="inline-flex h-10 cursor-pointer items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-muted">Importar plano desta empresa<input ref={accountInput} type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={readAccounts}/></label></div>
      {preview.length > 0 && <div className="rounded-md border border-border"><div className="flex items-center justify-between border-b border-border p-4"><span className="text-sm">Prévia de {fileName} · {preview.length} contas</span><div className="flex gap-2"><Button variant="outline" onClick={() => setPreview([])}>Cancelar</Button><Button onClick={confirmAccounts}>Confirmar</Button></div></div><AccountTable accounts={preview.slice(0, 5)}/></div>}
      <div className="rounded-md border border-border"><AccountTable accounts={filtered}/><div className="border-t border-border p-3 text-xs text-muted-foreground">{accounts.length} contas vinculadas exclusivamente a esta empresa</div></div>
    </TabsContent>

    <TabsContent value="cost-centers" className="space-y-5">
      <div className="rounded-md border border-border bg-muted/20 p-4 text-sm text-muted-foreground"><p className="font-medium text-foreground">Centro de custo não é obrigatório só porque a conta é analítica.</p><p className="mt-1 text-xs">A obrigatoriedade deve ser aprendida por conta, lado do lançamento e tipo de evento. Assim Caixa/Clientes podem ficar sem C.C., enquanto despesas ou receitas específicas recebem o centro correto.</p></div>
      <div className="grid gap-3 rounded-md border border-border p-4 md:grid-cols-[160px_minmax(0,1fr)_auto]"><Input value={newCenterCode} onChange={event => setNewCenterCode(event.target.value)} placeholder="Código"/><Input value={newCenterDescription} onChange={event => setNewCenterDescription(event.target.value)} placeholder="Descrição do centro de custo"/><Button onClick={() => void addCenter()}>Adicionar</Button></div>
      <div className="flex flex-wrap items-center justify-between gap-3"><Input className="w-full max-w-md" value={centerQuery} onChange={event => setCenterQuery(event.target.value)} placeholder="Buscar centro de custo"/><label className="inline-flex h-10 cursor-pointer items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-muted">Importar centros de custo<input ref={centerInput} type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={readCenters}/></label></div>
      {centerPreview.length > 0 && <div className="rounded-md border border-border"><div className="flex items-center justify-between border-b border-border p-4"><span className="text-sm">Prévia de {centerFileName} · {centerPreview.length} centro(s)</span><div className="flex gap-2"><Button variant="outline" onClick={() => setCenterPreview([])}>Cancelar</Button><Button onClick={() => void confirmCenters()}>Confirmar</Button></div></div><CostCenterTable centers={centerPreview.slice(0, 8)}/></div>}
      <div className="rounded-md border border-border"><CostCenterTable centers={filteredCenters}/><div className="border-t border-border p-3 text-xs text-muted-foreground">{centers.length} centro(s) de custo cadastrados para esta empresa</div></div>
    </TabsContent>
  </Tabs>;
}

function AccountTable({ accounts }: { accounts: ChartAccount[] }) {
  return <div className="overflow-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr>{["Conta", "Analítica", "C.R.", "Descrição", "SPED ECD/ECF"].map(header => <th key={header} className="border-b border-r border-border px-3 py-2 font-medium last:border-r-0">{header}</th>)}</tr></thead><tbody>{accounts.map(account => <tr key={account.id} className="border-b border-border last:border-0"><td className="border-r border-border px-3 py-2">{account.account}</td><td className="border-r border-border px-3 py-2">{account.analytical ? "Sim" : "Não"}</td><td className="border-r border-border px-3 py-2">{account.reducedCode}</td><td className="border-r border-border px-3 py-2">{account.description}</td><td className="px-3 py-2">{account.sped ? "Sim" : "Não"}</td></tr>)}{!accounts.length && <tr><td colSpan={5} className="h-40 text-center text-muted-foreground">Nenhum plano de contas importado para esta empresa.</td></tr>}</tbody></table></div>;
}

function CostCenterTable({ centers }: { centers: CostCenter[] }) {
  return <div className="overflow-auto"><table className="w-full min-w-[640px] text-sm"><thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="w-40 border-b border-r border-border px-3 py-2 font-medium">Código</th><th className="border-b border-r border-border px-3 py-2 font-medium">Descrição</th><th className="w-28 border-b border-border px-3 py-2 font-medium">Status</th></tr></thead><tbody>{centers.map(center => <tr key={center.id} className="border-b border-border last:border-0"><td className="border-r border-border px-3 py-2 font-mono">{center.code}</td><td className="border-r border-border px-3 py-2">{center.description || "Descrição não informada"}</td><td className="px-3 py-2">{center.active ? "Ativo" : "Inativo"}</td></tr>)}{!centers.length && <tr><td colSpan={3} className="h-40 text-center text-muted-foreground">Nenhum centro de custo cadastrado. Importe o cadastro exportado do Calima ou adicione manualmente.</td></tr>}</tbody></table></div>;
}
