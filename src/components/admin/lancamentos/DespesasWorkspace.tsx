import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Info, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartAccount } from "@/lib/lancamentos/chartOfAccounts";
import { alignExpenseEntriesWithAI, findCashAccount, rawExpenseRowsForExport } from "@/lib/lancamentos/expenseAlignment";
import { ExpenseEntry, ExpenseGroupSide, ExpenseImportIssue, GroupedExpenseEntry, exportGroupedExpenses, groupExpenseEntries, readExpenseWorkbook } from "@/lib/lancamentos/expenseWorkbook";
import { clearWorkspaceFiles, deleteWorkspaceData, loadWorkspaceData, loadWorkspaceFiles, removeWorkspaceDocumentsByName, saveWorkspaceData, saveWorkspaceFiles } from "@/lib/lancamentos/workspaceStorage";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AccountingWorkflowSteps, AccountCodeHover } from "./AccountingWorkflowUI";

export type WorkspaceStatus = "waiting" | "review" | "done";
interface Props { company: string; month: string; year: string; onFileCountChange?: (count: number) => void; onStatusChange?: (status: WorkspaceStatus) => void; onCompetenceChange?: (month: string, year: string) => void; }
interface SavedData { entries: ExpenseEntry[]; issues: ExpenseImportIssue[]; ignoredRows: number; alignedEntries?: GroupedExpenseEntry[]; alignmentUsedAI?: boolean; }
const displayClass = "flex h-8 items-center px-2 text-xs";
const currency = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const closingDate = (month: string, year: string) => `${new Date(+year, +month, 0).getDate().toString().padStart(2, "0")}/${month}/${year}`;
const isPaymentHistory = (history: string) => /(^|\s)(pagto|pagamento|pgto)(\.|\s|$)/i.test(history);

function LedgerTable({ rows }: { rows: ExpenseEntry[] }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[900px] table-fixed border-collapse text-xs">
    <thead className="bg-muted/50 text-left text-[11px] text-muted-foreground"><tr>
      <th className="w-[10%] border-b border-r border-border px-2 py-2 font-medium">Data</th>
      <th className="w-[34%] border-b border-r border-border px-2 py-2 font-medium">Histórico</th>
      <th className="w-[10%] border-b border-r border-border px-2 py-2 font-medium">Débito</th>
      <th className="w-[9%] border-b border-r border-border px-2 py-2 font-medium">C.C. D.</th>
      <th className="w-[10%] border-b border-r border-border px-2 py-2 font-medium">Crédito</th>
      <th className="w-[9%] border-b border-r border-border px-2 py-2 font-medium">C.C. C.</th>
      <th className="w-[18%] border-b border-border px-2 py-2 text-right font-medium">Valor</th>
    </tr></thead>
    <tbody>{rows.map(row => <tr key={row.id} className="h-8 border-b border-border last:border-b-0">
      <td className="border-r border-border"><span className={cn(displayClass, "tabular-nums")}>{row.date || "—"}</span></td>
      <td className="border-r border-border"><span className={cn(displayClass, "truncate")} title={row.history}>{row.history || "—"}</span></td>
      <td className="border-r border-border"><ExpenseAccountCell side="debit" code={row.debitCode} description={row.debitDescription} /></td>
      <td className="border-r border-border"><span className={displayClass}>{row.debitCostCenter || "—"}</span></td>
      <td className="border-r border-border"><ExpenseAccountCell side="credit" code={row.creditCode} description={row.creditDescription} /></td>
      <td className="border-r border-border"><span className={displayClass}>{row.creditCostCenter || "—"}</span></td>
      <td className="text-right tabular-nums"><span className={cn(displayClass, "justify-end")}>{currency(row.amountInCents)}</span></td>
    </tr>)}{!rows.length && <tr><td colSpan={7} className="h-40 text-center text-muted-foreground">Nenhum lançamento nesta competência.</td></tr>}</tbody>
  </table></div>;
}

function ExpenseAccountCell({ code, description, side }: { code: string; description: string; side: "debit" | "credit" }) {
  return <div className={displayClass}><AccountCodeHover code={code} description={description} side={side} /></div>;
}

export function DespesasWorkspace({ company, month, year, onFileCountChange, onStatusChange, onCompetenceChange }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [alignedEntries, setAlignedEntries] = useState<GroupedExpenseEntry[]>([]);
  const [alignmentUsedAI, setAlignmentUsedAI] = useState(false);
  const [alignmentMessage, setAlignmentMessage] = useState("");
  const [aligning, setAligning] = useState(false);
  const [issues, setIssues] = useState<ExpenseImportIssue[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [ignoredRows, setIgnoredRows] = useState(0);
  const [groupSide, setGroupSide] = useState<ExpenseGroupSide>("debit");
  const [view, setView] = useState("detalhada");
  const [reading, setReading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pending, setPending] = useState<SavedData | null>(null);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [competenceWarning, setCompetenceWarning] = useState<{ month: string; year: string } | null>(null);
  const [mixedCompetences, setMixedCompetences] = useState<string[]>([]);
  const scope = `${company}:${year}:${month}:despesas`;
  const dataKey = `${scope}:parsed`;
  const competence = `${month}/${year}`;
  const grouped = useMemo(() => groupExpenseEntries(entries, groupSide, closingDate(month, year)), [entries, groupSide, month, year]);
  const detailedTotal = entries.reduce((sum, row) => sum + row.amountInCents, 0);
  const rawExportRows = useMemo(() => rawExpenseRowsForExport(entries), [entries]);
  const exportRows = alignedEntries.length ? alignedEntries : rawExportRows;
  const exportTotal = exportRows.reduce((sum, row) => sum + row.amountInCents, 0);
  const outside = entries.filter(row => row.date && !row.date.endsWith(`/${month}/${year}`)).length;
  const chartCodes = useMemo(() => new Set(accounts.map(account => account.reducedCode)), [accounts]);
  const unknownAccounts = entries.filter(row => !chartCodes.has(row.debitCode) || !chartCodes.has(row.creditCode)).length;
  const canExport = entries.length > 0 && issues.length === 0 && outside === 0 && detailedTotal === exportTotal;
  const canConfirm = canExport;

  const applyChart = (rows: ExpenseEntry[]) => {
    const chart = new Map(accounts.map(account => [account.reducedCode, account.description]));
    return rows.map(row => ({ ...row, debitDescription: row.debitDescription || chart.get(row.debitCode) || "", creditDescription: row.creditDescription || chart.get(row.creditCode) || "", debitCostCenter: row.debitCostCenter ?? "", creditCostCenter: row.creditCostCenter ?? "" }));
  };

  useEffect(() => {
    let active = true;
    setLoaded(false); setEntries([]); setAlignedEntries([]); setIssues([]); setFiles([]); setIgnoredRows(0); setAlignmentMessage("");
    Promise.all([loadWorkspaceData<SavedData>(dataKey), loadWorkspaceFiles(scope), loadWorkspaceData<ChartAccount[]>(`${company}:chart-of-accounts`)]).then(([saved, storedFiles, chart]) => {
      if (!active) return;
      if (saved) {
        setEntries(saved.entries.map(row => ({ ...row, debitCostCenter: row.debitCostCenter ?? "", creditCostCenter: row.creditCostCenter ?? "" })));
        setAlignedEntries(saved.alignedEntries ?? []); setAlignmentUsedAI(Boolean(saved.alignmentUsedAI)); setIssues(saved.issues); setIgnoredRows(saved.ignoredRows);
      }
      setFiles(storedFiles.map(file => file.name)); setAccounts(chart ?? []); setLoaded(true);
    });
    return () => { active = false; };
  }, [company, dataKey, scope]);

  useEffect(() => { if (loaded) void saveWorkspaceData(dataKey, { entries, issues, ignoredRows, alignedEntries, alignmentUsedAI }); }, [alignedEntries, alignmentUsedAI, dataKey, entries, ignoredRows, issues, loaded]);
  useEffect(() => { if (!accounts.length) return; const chart = new Map(accounts.map(account => [account.reducedCode, account.description])); setEntries(current => current.map(row => ({ ...row, debitDescription: row.debitDescription || chart.get(row.debitCode) || "", creditDescription: row.creditDescription || chart.get(row.creditCode) || "" }))); }, [accounts]);
  useEffect(() => onFileCountChange?.(files.length), [files.length, onFileCountChange]);

  const readFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []); event.target.value = ""; if (!selected.length) return;
    setReading(true); setMixedCompetences([]);
    const result: SavedData = { entries: [], issues: [], ignoredRows: 0 };
    for (const file of selected) {
      try { const parsed = await readExpenseWorkbook(file); result.entries.push(...parsed.entries); result.issues.push(...parsed.issues); result.ignoredRows += parsed.ignoredRows; }
      catch { result.issues.push({ id: `${file.name}-erro`, fileName: file.name, sheetName: "", row: 0, message: "Não foi possível ler este arquivo." }); }
    }
    setPendingFiles(selected); setPending(result); setReading(false);
  };

  const detectedCompetences = () => [...new Set((pending?.entries ?? []).flatMap(row => { const match = row.date.match(/^\d{2}\/(\d{2})\/(20\d{2})$/); return match ? [`${match[1]}/${match[2]}`] : []; }))].sort();
  const requestConfirm = () => {
    const detected = detectedCompetences();
    if (detected.length > 1) { setMixedCompetences(detected); return; }
    if (detected.length === 1) { const [detectedMonth, detectedYear] = detected[0].split("/"); if (detectedMonth !== month || detectedYear !== year) { setCompetenceWarning({ month: detectedMonth, year: detectedYear }); return; } }
    void confirm();
  };

  const confirm = async (target = { month, year }) => {
    if (!pending) return;
    const resolved = applyChart(pending.entries);
    const targetScope = `${company}:${target.year}:${target.month}:despesas`;
    const targetKey = `${targetScope}:parsed`;
    if (target.month === month && target.year === year) {
      setEntries(current => [...current, ...resolved.filter(row => !current.some(saved => saved.id === row.id))]);
      setAlignedEntries([]); setAlignmentUsedAI(false); setAlignmentMessage("");
      setIssues(current => [...current, ...pending.issues]); setIgnoredRows(current => current + pending.ignoredRows); setFiles(current => Array.from(new Set([...current, ...pendingFiles.map(file => file.name)])));
    } else {
      const saved = await loadWorkspaceData<SavedData>(targetKey); const current = saved ?? { entries: [], issues: [], ignoredRows: 0 };
      await saveWorkspaceData(targetKey, { entries: [...current.entries, ...resolved.filter(row => !current.entries.some(savedRow => savedRow.id === row.id))], issues: [...current.issues, ...pending.issues], ignoredRows: current.ignoredRows + pending.ignoredRows, alignedEntries: [], alignmentUsedAI: false });
    }
    await saveWorkspaceFiles(targetScope, pendingFiles, { skipCompetencePrompt: true });
    setPending(null); setPendingFiles([]); setCompetenceWarning(null); setMixedCompetences([]);
    if (target.month !== month || target.year !== year) onCompetenceChange?.(target.month, target.year); else onStatusChange?.("review");
  };

  const alignWithAI = async () => {
    if (!entries.length || aligning) return;
    const paymentRows = entries.filter(row => isPaymentHistory(row.history));
    const cash = findCashAccount(accounts);
    if (paymentRows.length && !cash) { setAlignmentMessage("Não encontrei uma conta analítica Caixa Matriz ou Caixa Geral no plano desta empresa. O alinhamento foi bloqueado para não usar banco específico."); return; }
    setAligning(true); setAlignmentMessage("");
    try {
      const result = await alignExpenseEntriesWithAI(entries, accounts, closingDate(month, year));
      setAlignedEntries(result.rows); setAlignmentUsedAI(result.usedAI);
      setAlignmentMessage(result.usedAI
        ? `${entries.length} lançamentos foram alinhados em ${result.rows.length} linha(s). Históricos revisados com IA${result.cashAccount ? ` · pagamentos em ${result.cashAccount.description}` : ""}.`
        : `${entries.length} lançamentos foram alinhados em ${result.rows.length} linha(s)${result.cashAccount ? ` · pagamentos em ${result.cashAccount.description}` : ""}. A revisão de históricos por IA ficou indisponível nesta execução e foi aplicada a padronização segura.`);
      onStatusChange?.("review");
    } catch (error) {
      setAlignmentMessage(error instanceof Error ? error.message : "Não foi possível alinhar as despesas.");
    } finally { setAligning(false); }
  };

  const deleteDocument = async (fileName: string) => {
    setDeletingFile(fileName); setLoaded(false); onStatusChange?.("waiting");
    try {
      await removeWorkspaceDocumentsByName(scope, [fileName]); await deleteWorkspaceData(dataKey);
      const remainingFiles = await loadWorkspaceFiles(scope);
      if (!remainingFiles.length) { setEntries([]); setAlignedEntries([]); setIssues([]); setFiles([]); setIgnoredRows(0); return; }
      const rebuilt: SavedData = { entries: [], issues: [], ignoredRows: 0 };
      for (const file of remainingFiles) {
        try { const parsed = await readExpenseWorkbook(file); rebuilt.entries.push(...parsed.entries); rebuilt.issues.push(...parsed.issues); rebuilt.ignoredRows += parsed.ignoredRows; }
        catch { rebuilt.issues.push({ id: `${file.name}-erro`, fileName: file.name, sheetName: "", row: 0, message: "Não foi possível reler este arquivo após a exclusão." }); }
      }
      const rebuiltResolved = { ...rebuilt, entries: applyChart(rebuilt.entries), alignedEntries: [], alignmentUsedAI: false };
      setEntries(rebuiltResolved.entries); setAlignedEntries([]); setIssues(rebuiltResolved.issues); setIgnoredRows(rebuiltResolved.ignoredRows); setFiles(remainingFiles.map(file => file.name)); await saveWorkspaceData(dataKey, rebuiltResolved); onStatusChange?.("review");
    } finally { setLoaded(true); setDeletingFile(null); }
  };

  const clear = async () => {
    setLoaded(false); setEntries([]); setAlignedEntries([]); setIssues([]); setFiles([]); setIgnoredRows(0); setAlignmentMessage("");
    await clearWorkspaceFiles(scope); await deleteWorkspaceData(dataKey); setLoaded(true); onStatusChange?.("waiting");
  };

  const displayGrouped = grouped.map(row => ({ ...row, id: row.sourceEntryIds.join("-") }));

  return <section className="mt-8 space-y-8">
    <div className="rounded-md border border-border bg-background p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><h3 className="font-semibold">Despesas de {competence}</h3><Button variant="outline" disabled={reading} onClick={() => fileInput.current?.click()}>{reading ? "Lendo arquivo..." : `Importar despesas de ${competence}`}</Button><input ref={fileInput} type="file" multiple accept=".xlsx,.xls,.csv" className="sr-only" onChange={readFiles}/></div>
      <div className="mt-5 border-t border-border pt-5 text-sm text-muted-foreground">{files.length ? <div className="flex flex-wrap gap-2">{files.map(file => <span key={file} className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-muted/25 px-2.5 py-1.5 text-xs text-foreground"><span className="max-w-[420px] truncate" title={file}>{file}</span><Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive" disabled={Boolean(deletingFile)} onClick={() => void deleteDocument(file)} title="Excluir documento e seus lançamentos"><Trash2 className="h-3.5 w-3.5" /></Button></span>)}<button className="ml-2 text-xs underline" onClick={() => void clear()}>Limpar importação</button></div> : "Nenhum arquivo selecionado nesta competência."}</div>
    </div>

    {pending && <div className="rounded-md border border-border bg-background"><div className="flex items-center justify-between border-b border-border p-4"><div><h3 className="font-semibold">Prévia da importação</h3><p className="text-xs text-muted-foreground">Cinco primeiras linhas exatamente como vieram do Calima</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => { setPending(null); setPendingFiles([]); setMixedCompetences([]); }}>Cancelar</Button><Button onClick={requestConfirm} disabled={!pending.entries.length}>Confirmar importação</Button></div></div>{mixedCompetences.length > 1 && <div className="m-4 flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-medium">O arquivo mistura competências diferentes.</p><p className="mt-1 text-xs">Foram encontrados {mixedCompetences.join(", ")}. Separe os documentos/linhas por competência antes de importar. Nada foi salvo.</p></div></div>}<LedgerTable rows={pending.entries.slice(0,5)}/></div>}

    <Tabs defaultValue="transcricao">
      <AccountingWorkflowSteps steps={[
        { value: "transcricao", label: "Transcrição", count: entries.length },
        { value: "lancamentos", label: "Lançamentos", count: exportRows.length },
        { value: "conferencia", label: "Conferência", count: issues.length + outside },
      ]} />

      <TabsContent value="transcricao" className="mt-6">
        <div className="mb-5"><h3 className="text-base font-semibold text-foreground">Despesas · Transcrição</h3><p className="mt-1 text-sm text-muted-foreground">O conteúdo importado do Calima é preservado. Contas, C.C., valor e histórico não são alterados automaticamente.</p></div>
        <div className="rounded-md border border-border bg-background">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5"><Tabs value={view} onValueChange={setView}><TabsList><TabsTrigger value="detalhada">Visão detalhada</TabsTrigger><TabsTrigger value="agrupada">Visão agrupada</TabsTrigger><TabsTrigger value="leitura">Conferência da leitura</TabsTrigger></TabsList></Tabs>{view === "agrupada" && <div className="flex items-center gap-2 text-xs"><span className="text-muted-foreground">Agrupar por</span>{(["debit","credit"] as ExpenseGroupSide[]).map(side => <button key={side} onClick={() => setGroupSide(side)} className={cn("rounded border px-3 py-1.5", groupSide === side && "bg-foreground text-background")}>{side === "debit" ? "Débito" : "Crédito"}</button>)}</div>}</div>
          {view === "detalhada" && <LedgerTable rows={entries}/>} {view === "agrupada" && <LedgerTable rows={displayGrouped}/>} {view === "leitura" && <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3"><Stat label="Lançamentos válidos" value={entries.length}/><Stat label="Linhas com problema" value={issues.length}/><Stat label="Linhas informativas" value={ignoredRows}/><Stat label="Fora da competência" value={outside}/><Stat label="Contas não encontradas no plano" value={unknownAccounts}/><Stat label="Total identificado" value={currency(detailedTotal)}/>{issues.map(issue => <p key={issue.id} className="col-span-full text-sm text-muted-foreground">{issue.fileName} · linha {issue.row}: {issue.message}</p>)}</div>}
          <div className="flex flex-wrap justify-between gap-3 border-t border-border p-4 text-xs text-muted-foreground"><span>{entries.length} lançamentos originais · {currency(detailedTotal)}</span><span>Visão agrupada é apenas uma prévia; não altera o original.</span></div>
        </div>
      </TabsContent>

      <TabsContent value="lancamentos" className="mt-6">
        <div className="rounded-md border border-border bg-background">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4"><div><h3 className="font-semibold">Lançamentos para o Calima</h3><p className="mt-1 text-xs text-muted-foreground">Sem alinhamento, exporta exatamente os lançamentos importados. O alinhamento é opcional e só roda quando você solicitar.</p></div><div className="flex gap-2"><Button variant="outline" disabled={!entries.length || aligning} onClick={() => void alignWithAI()}>{aligning ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Alinhando...</> : <><Sparkles className="mr-2 h-4 w-4"/>Alinhar com IA</>}</Button>{alignedEntries.length > 0 && <Button variant="outline" onClick={() => { setAlignedEntries([]); setAlignmentUsedAI(false); setAlignmentMessage("Versão alinhada descartada. O original do Calima voltou a ser usado."); }}>Usar original</Button>}<Button disabled={!canExport} onClick={() => exportGroupedExpenses(exportRows, competence)}>Exportar para o Calima</Button></div></div>
          {alignmentMessage && <div className="border-b border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">{alignmentMessage}</div>}
          <LedgerTable rows={exportRows}/>
          <div className="flex flex-wrap gap-4 border-t border-border p-4 text-xs text-muted-foreground"><span>{alignedEntries.length ? `${entries.length} originais → ${alignedEntries.length} alinhados` : `${entries.length} lançamentos originais`}</span><span>Total: {currency(exportTotal)}</span>{alignedEntries.length > 0 && <span>{alignmentUsedAI ? "Históricos revisados com IA" : "Históricos padronizados sem alterar valores/contas de despesa"}</span>}</div>
        </div>
      </TabsContent>

      <TabsContent value="conferencia" className="mt-6"><div className="flex flex-col gap-5 rounded-md border border-border bg-background p-5 sm:flex-row sm:items-center sm:justify-between"><div className="grid flex-1 gap-4 sm:grid-cols-4"><Stat label="Documento" value={currency(detailedTotal)}/><Stat label="Para exportação" value={currency(exportTotal)}/><Stat label="Diferença" value={currency(exportTotal-detailedTotal)}/><Stat label="Pendências reais" value={issues.length+outside}/></div><Button disabled={!canConfirm} onClick={() => onStatusChange?.("done")}>Marcar despesas como OK</Button></div></TabsContent>
    </Tabs>

    <Dialog open={Boolean(competenceWarning)} onOpenChange={open => !open && setCompetenceWarning(null)}><DialogContent><DialogHeader><DialogTitle>Competência diferente do documento</DialogTitle><DialogDescription>Você está trabalhando em {competence}, mas o arquivo pertence a {competenceWarning?.month}/{competenceWarning?.year}.</DialogDescription></DialogHeader><p className="text-sm text-muted-foreground">Nada foi salvo ainda. Ao continuar, os dados serão gravados na competência correta do documento e você será levado automaticamente até ela.</p><DialogFooter><Button variant="outline" onClick={() => { setCompetenceWarning(null); setPending(null); setPendingFiles([]); }}>Excluir importação</Button><Button onClick={() => competenceWarning && void confirm(competenceWarning)}>Manter em {competenceWarning?.month}/{competenceWarning?.year}</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}

function Stat({ label, value }: { label: string; value: string | number }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold tabular-nums">{value}</p></div>; }
