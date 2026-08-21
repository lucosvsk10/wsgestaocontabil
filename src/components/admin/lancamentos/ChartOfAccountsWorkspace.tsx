import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChartAccount, readChartOfAccounts } from "@/lib/lancamentos/chartOfAccounts";
import { isWorkspaceDataSynced, loadWorkspaceData, saveWorkspaceData } from "@/lib/lancamentos/workspaceStorage";

export function ChartOfAccountsWorkspace({ company, companyName }: { company: string; companyName: string }) {
  const input = useRef<HTMLInputElement>(null); const [accounts, setAccounts] = useState<ChartAccount[]>([]); const [preview, setPreview] = useState<ChartAccount[]>([]); const [query, setQuery] = useState(""); const [fileName, setFileName] = useState(""); const [error, setError] = useState("");
  const [storageStatus, setStorageStatus] = useState<"loading" | "synced" | "local" | "empty">("loading");
  const key = `${company}:chart-of-accounts`;
  useEffect(() => {
    let active = true;
    setStorageStatus("loading");
    setError("");
    void (async () => {
      let saved = await loadWorkspaceData<ChartAccount[]>(key);
      let synced = saved?.length ? await isWorkspaceDataSynced(key) : false;
      const isLegacyEL = companyName.toUpperCase().startsWith("E L DA SILVA");
      if ((!saved || !saved.length) && isLegacyEL && company !== "el-da-silva") {
        const legacy = await loadWorkspaceData<ChartAccount[]>("el-da-silva:chart-of-accounts");
        if (legacy?.length) {
          const result = await saveWorkspaceData(key, legacy);
          saved = legacy;
          synced = result.synced;
          if (!result.synced) setError("O plano antigo foi recuperado neste navegador, mas não pôde ser sincronizado com o servidor.");
        }
      }
      if (!active) return;
      setAccounts(saved ?? []);
      setStorageStatus(saved?.length ? (synced ? "synced" : "local") : "empty");
    })();
    return () => { active = false; };
  }, [company, companyName, key]);
  const filtered = useMemo(() => { const term = query.trim().toLowerCase(); return term ? accounts.filter(a => [a.account,a.reducedCode,a.description].some(v => v.toLowerCase().includes(term))) : accounts; }, [accounts, query]);
  const read = async (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; setError(""); try { const parsed = await readChartOfAccounts(file); if (!parsed.length) { setError("Nenhuma conta foi reconhecida. Confirme as colunas Conta, Analítica, C.R., Descrição e SPED ECD/ECF."); return; } setPreview(parsed); setFileName(file.name); } catch { setError("Não foi possível abrir o arquivo. Use XLSX, XLS ou CSV exportado pelo Calima."); } };
  const confirm = async () => { const next = Array.from(new Map(preview.map(a => [a.reducedCode || a.account, a])).values()); const result = await saveWorkspaceData(key, next); setAccounts(next); setStorageStatus(result.synced ? "synced" : "local"); setError(result.synced ? "" : `O plano ficou salvo somente neste navegador. O servidor recusou a sincronização: ${result.error ?? "erro não informado"}`); setPreview([]); setFileName(""); };
  const statusText = storageStatus === "loading" ? "Verificando armazenamento..." : storageStatus === "synced" ? "Sincronizado com o servidor" : storageStatus === "local" ? "Salvo apenas neste navegador" : "Nenhum plano salvo";
  return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex w-full max-w-md flex-col gap-1"><Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar conta, C.R. ou descrição"/><span className="text-xs text-muted-foreground">{statusText}</span></div><label className="inline-flex h-10 cursor-pointer items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-muted">Importar plano desta empresa<input ref={input} type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={read}/></label></div>{error && <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}{preview.length > 0 && <div className="rounded-md border border-border"><div className="flex items-center justify-between border-b border-border p-4"><span className="text-sm">Prévia de {fileName} · {preview.length} contas</span><div className="flex gap-2"><Button variant="outline" onClick={() => setPreview([])}>Cancelar</Button><Button onClick={confirm}>Confirmar</Button></div></div><AccountTable accounts={preview.slice(0,5)}/></div>}<div className="rounded-md border border-border"><AccountTable accounts={filtered}/><div className="border-t border-border p-3 text-xs text-muted-foreground">{accounts.length} contas vinculadas exclusivamente a esta empresa</div></div></div>;
}
function AccountTable({ accounts }: { accounts: ChartAccount[] }) { return <div className="overflow-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr>{["Conta","Analítica","C.R.","Descrição","SPED ECD/ECF"].map(h => <th key={h} className="border-b border-r border-border px-3 py-2 font-medium last:border-r-0">{h}</th>)}</tr></thead><tbody>{accounts.map(a => <tr key={a.id} className="border-b border-border last:border-0"><td className="border-r border-border px-3 py-2">{a.account}</td><td className="border-r border-border px-3 py-2">{a.analytical ? "Sim" : "Não"}</td><td className="border-r border-border px-3 py-2">{a.reducedCode}</td><td className="border-r border-border px-3 py-2">{a.description}</td><td className="px-3 py-2">{a.sped ? "Sim" : "Não"}</td></tr>)}{!accounts.length && <tr><td colSpan={5} className="h-40 text-center text-muted-foreground">Nenhum plano de contas importado para esta empresa.</td></tr>}</tbody></table></div>; }
