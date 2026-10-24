import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Download, Loader2, Pencil, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartAccount } from "@/lib/lancamentos/chartOfAccounts";
import { alignExpenseEntriesWithAI, loadExpenseHistoryMemory, rawExpenseRowsForExport } from "@/lib/lancamentos/expenseAlignment";
import { ExpenseEntry, ExpenseImportIssue, GroupedExpenseEntry, exportGroupedExpenses, groupExpenseEntries, readExpenseWorkbook } from "@/lib/lancamentos/expenseWorkbook";
import { clearWorkspaceFiles, deleteWorkspaceData, loadWorkspaceData, loadWorkspaceFiles, removeWorkspaceDocumentsByName, saveWorkspaceData, saveWorkspaceFiles } from "@/lib/lancamentos/workspaceStorage";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AccountingWorkflowSteps, AccountCodeHover } from "./AccountingWorkflowUI";

export type WorkspaceStatus = "waiting" | "review" | "done";
interface Props { company: string; month: string; year: string; onFileCountChange?: (count: number) => void; onStatusChange?: (status: WorkspaceStatus) => void; onCompetenceChange?: (month: string, year: string) => void; }
interface SavedData { entries: ExpenseEntry[]; issues: ExpenseImportIssue[]; ignoredRows: number; alignedEntries?: GroupedExpenseEntry[]; alignmentUsedAI?: boolean; alignmentVersion?: number; }
const EXPENSE_ALIGNMENT_VERSION = 3;
const displayClass = "flex h-8 items-center px-2 text-xs";
const currency = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const closingDate = (month: string, year: string) => `${new Date(+year, +month, 0).getDate().toString().padStart(2, "0")}/${month}/${year}`;

function LedgerTable({
  rows,
  editable = false,
  editingId = null,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
}: {
  rows: ExpenseEntry[];
  editable?: boolean;
  editingId?: string | null;
  onEdit?: (id: string) => void;
  onCancelEdit?: () => void;
  onUpdate?: (id: string, field: keyof ExpenseEntry, value: string) => void;
  onDelete?: (id: string) => void;
}) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[1020px] table-fixed border-collapse text-xs">
    <thead className="bg-muted/50 text-left text-[11px] text-muted-foreground"><tr>
      <th className="w-[10%] border-b border-r border-border px-2 py-2 font-medium">Data</th>
      <th className="w-[29%] border-b border-r border-border px-2 py-2 font-medium">Histórico</th>
      <th className="w-[9%] border-b border-r border-border px-2 py-2 font-medium">Débito</th>
      <th className="w-[8%] border-b border-r border-border px-2 py-2 font-medium">C.C. D.</th>
      <th className="w-[9%] border-b border-r border-border px-2 py-2 font-medium">Crédito</th>
      <th className="w-[8%] border-b border-r border-border px-2 py-2 font-medium">C.C. C.</th>
      <th className="w-[14%] border-b border-r border-border px-2 py-2 text-right font-medium">Valor</th>
      <th className="w-[13%] border-b border-border px-2 py-2 text-right font-medium">Ações</th>
    </tr></thead>
    <tbody>{rows.map(row => {
      const editing = editable && editingId === row.id;
      const recentlyImported = Boolean(row.importedWithoutReferenceAt);
      const highlight = recentlyImported ? recentImportClass(`${row.importBatchId || row.id}:${row.date.slice(3)}`) : "";
      return <tr key={row.id} className={cn("h-8 border-b border-border last:border-b-0", highlight)}>
        <td className="border-r border-border">{editing ? <Input className="h-7 rounded-none border-0 bg-transparent px-2 text-xs" value={row.date} onChange={event => onUpdate?.(row.id, "date", event.target.value)} /> : <span className={cn(displayClass, "tabular-nums")}>{row.date || "—"}</span>}</td>
        <td className="border-r border-border">{editing ? <Input className="h-7 rounded-none border-0 bg-transparent px-2 text-xs" value={row.history} onChange={event => onUpdate?.(row.id, "history", event.target.value)} /> : <span className={cn(displayClass, "truncate")} title={row.history}>{row.history || "—"}</span>}</td>
        <td className="border-r border-border">{editing ? <Input className="h-7 rounded-none border-0 bg-transparent px-2 text-xs" value={row.debitCode} onChange={event => onUpdate?.(row.id, "debitCode", event.target.value)} /> : <ExpenseAccountCell side="debit" code={row.debitCode} description={row.debitDescription} />}</td>
        <td className="border-r border-border">{editing ? <Input className="h-7 rounded-none border-0 bg-transparent px-2 text-xs" value={row.debitCostCenter || ""} onChange={event => onUpdate?.(row.id, "debitCostCenter", event.target.value)} /> : <span className={displayClass}>{row.debitCostCenter || "—"}</span>}</td>
        <td className="border-r border-border">{editing ? <Input className="h-7 rounded-none border-0 bg-transparent px-2 text-xs" value={row.creditCode} onChange={event => onUpdate?.(row.id, "creditCode", event.target.value)} /> : <ExpenseAccountCell side="credit" code={row.creditCode} description={row.creditDescription} />}</td>
        <td className="border-r border-border">{editing ? <Input className="h-7 rounded-none border-0 bg-transparent px-2 text-xs" value={row.creditCostCenter || ""} onChange={event => onUpdate?.(row.id, "creditCostCenter", event.target.value)} /> : <span className={displayClass}>{row.creditCostCenter || "—"}</span>}</td>
        <td className="border-r border-border text-right tabular-nums">{editing ? <Input className="h-7 rounded-none border-0 bg-transparent px-2 text-right text-xs" value={(row.amountInCents / 100).toFixed(2).replace(".", ",")} onChange={event => onUpdate?.(row.id, "amountInCents", event.target.value)} /> : <span className={cn(displayClass, "justify-end")}>{currency(row.amountInCents)}</span>}</td>
        <td className="px-2 py-1">
          {editable ? <div className="flex justify-end gap-1">
            {editing ? <>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCancelEdit?.()} title="Concluir edição"><Save className="h-3.5 w-3.5" /></Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCancelEdit?.()} title="Fechar edição"><X className="h-3.5 w-3.5" /></Button>
            </> : <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit?.(row.id)} title="Editar lançamento"><Pencil className="h-3.5 w-3.5" /></Button>}
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete?.(row.id)} title="Excluir lançamento"><Trash2 className="h-3.5 w-3.5" /></Button>
          </div> : recentlyImported ? <span className="inline-flex rounded-full border border-current/15 bg-background/70 px-2 py-0.5 text-[10px] font-medium text-foreground">Sem referência</span> : null}
        </td>
      </tr>;
    })}{!rows.length && <tr><td colSpan={8} className="h-40 text-center text-muted-foreground">Nenhum lançamento nesta competência.</td></tr>}</tbody>
  </table></div>;
}

function recentImportClass(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
  const classes = [
    "bg-cyan-500/[0.08]",
    "bg-violet-500/[0.08]",
    "bg-amber-500/[0.08]",
    "bg-emerald-500/[0.08]",
    "bg-blue-500/[0.08]",
  ];
  return classes[Math.abs(hash) % classes.length];
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
  const [view, setView] = useState("detalhada");
  const [reading, setReading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pending, setPending] = useState<SavedData | null>(null);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [competenceWarning, setCompetenceWarning] = useState<{ month: string; year: string } | null>(null);
  const [mixedCompetences, setMixedCompetences] = useState<string[]>([]);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const scope = `${company}:${year}:${month}:despesas`;
  const dataKey = `${scope}:parsed`;
  const competence = `${month}/${year}`;
  const grouped = useMemo(() => groupExpenseEntries(entries, closingDate(month, year)), [entries, month, year]);
  const detailedTotal = entries.reduce((sum, row) => sum + row.amountInCents, 0);
  const rawExportRows = useMemo(() => rawExpenseRowsForExport(entries), [entries]);
  const exportRows = alignedEntries.length ? alignedEntries : rawExportRows;
  const exportTotal = exportRows.reduce((sum, row) => sum + row.amountInCents, 0);
  const outside = entries.filter(row => row.date && !row.date.endsWith(`/${month}/${year}`)).length;
  const chartCodes = useMemo(() => new Set(accounts.map(account => account.reducedCode)), [accounts]);
  const unknownAccounts = entries.filter(row => !chartCodes.has(row.debitCode) || !chartCodes.has(row.creditCode)).length;
  const canExport = entries.length > 0 && issues.length === 0 && outside === 0 && detailedTotal === exportTotal;
  // Conferência depende da integridade dos lançamentos, não da existência de
  // um arquivo de exportação/alinhamento previamente gerado.
  const canConfirm = true; // Aprovação manual é independente das pendências de importação.

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
        const currentAlignment = saved.alignmentVersion === EXPENSE_ALIGNMENT_VERSION;
        setAlignedEntries(currentAlignment ? (saved.alignedEntries ?? []) : []);
        setAlignmentUsedAI(currentAlignment && Boolean(saved.alignmentUsedAI));
        if (!currentAlignment && saved.alignedEntries?.length) {
          setAlignmentMessage("O agrupamento salvo usava a regra anterior e foi descartado. Clique em Agrupar lançamentos para recriar exatamente a partir da Visão agrupada.");
        }
        setIssues(saved.issues); setIgnoredRows(saved.ignoredRows);
      }
      setFiles(storedFiles.map(file => file.name)); setAccounts(chart ?? []); setLoaded(true);
    });
    return () => { active = false; };
  }, [company, dataKey, scope]);

  useEffect(() => { if (loaded) void saveWorkspaceData(dataKey, { entries, issues, ignoredRows, alignedEntries, alignmentUsedAI, alignmentVersion: EXPENSE_ALIGNMENT_VERSION }); }, [alignedEntries, alignmentUsedAI, dataKey, entries, ignoredRows, issues, loaded]);
  useEffect(() => { if (!accounts.length) return; const chart = new Map(accounts.map(account => [account.reducedCode, account.description])); setEntries(current => current.map(row => ({ ...row, debitDescription: row.debitDescription || chart.get(row.debitCode) || "", creditDescription: row.creditDescription || chart.get(row.creditCode) || "" }))); }, [accounts]);
  useEffect(() => onFileCountChange?.(files.length), [files.length, onFileCountChange]);

  const readFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []); event.target.value = ""; if (!selected.length) return;
    if (!accounts.length) {
      setIssues([{ id: "missing-chart-of-accounts", fileName: selected[0]?.name ?? "", sheetName: "", row: 0, message: "Importe o Plano de Contas desta empresa antes de importar Despesas." }]);
      return;
    }
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
      await saveWorkspaceData(targetKey, { entries: [...current.entries, ...resolved.filter(row => !current.entries.some(savedRow => savedRow.id === row.id))], issues: [...current.issues, ...pending.issues], ignoredRows: current.ignoredRows + pending.ignoredRows, alignedEntries: [], alignmentUsedAI: false, alignmentVersion: EXPENSE_ALIGNMENT_VERSION });
    }
    await saveWorkspaceFiles(targetScope, pendingFiles, { skipCompetencePrompt: true });
    setPending(null); setPendingFiles([]); setCompetenceWarning(null); setMixedCompetences([]);
    if (target.month !== month || target.year !== year) onCompetenceChange?.(target.month, target.year); else onStatusChange?.("review");
  };

  const updateEntry = (id: string, field: keyof ExpenseEntry, value: string) => {
    setEntries(current => current.map(row => {
      if (row.id !== id) return row;
      if (field === "amountInCents") {
        const raw = String(value).replace(/R\$/gi, "").replace(/\s/g, "");
        const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
        const parsed = Number(normalized);
        return Number.isFinite(parsed) && parsed >= 0 ? { ...row, amountInCents: Math.round(parsed * 100) } : row;
      }
      if (field === "debitCode" || field === "creditCode") {
        const code = String(value).trim();
        const account = accounts.find(item => item.reducedCode === code);
        return field === "debitCode"
          ? { ...row, debitCode: code, debitDescription: account?.description || "" }
          : { ...row, creditCode: code, creditDescription: account?.description || "" };
      }
      return { ...row, [field]: value };
    }));
    setAlignedEntries([]);
    setAlignmentUsedAI(false);
    setAlignmentMessage("Uma linha foi editada. O agrupamento anterior foi descartado para evitar exportar dados desatualizados.");
    onStatusChange?.("review");
  };

  const deleteEntry = (id: string) => {
    setEntries(current => current.filter(row => row.id !== id));
    setEditingEntryId(current => current === id ? null : current);
    setAlignedEntries([]);
    setAlignmentUsedAI(false);
    setAlignmentMessage("Uma linha foi excluída. O agrupamento anterior foi descartado e precisa ser gerado novamente, se desejado.");
    onStatusChange?.("review");
  };

  const updateAlignedEntry = (id: string, field: keyof ExpenseEntry, value: string) => {
    setAlignedEntries(current => current.map(row => {
      if (row.id !== id) return row;
      if (field === "amountInCents") {
        const raw = String(value).replace(/R\$/gi, "").replace(/\s/g, "");
        const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
        const parsed = Number(normalized);
        return Number.isFinite(parsed) && parsed >= 0 ? { ...row, amountInCents: Math.round(parsed * 100) } : row;
      }
      if (field === "debitCode" || field === "creditCode") {
        const code = String(value).trim();
        const account = accounts.find(item => item.reducedCode === code);
        return field === "debitCode"
          ? { ...row, debitCode: code, debitDescription: account?.description || "" }
          : { ...row, creditCode: code, creditDescription: account?.description || "" };
      }
      return { ...row, [field]: value };
    }));
    setAlignmentMessage("Lançamento agrupado editado manualmente. Revise a conferência antes de exportar.");
    onStatusChange?.("review");
  };

  const deleteAlignedEntry = (id: string) => {
    setAlignedEntries(current => current.filter(row => row.id !== id));
    setEditingEntryId(current => current === id ? null : current);
    setAlignmentMessage("Lançamento agrupado excluído manualmente. O total de exportação foi atualizado.");
    onStatusChange?.("review");
  };

  const alignWithAI = async () => {
    if (!entries.length || aligning) return;
    setAligning(true); setAlignmentMessage("");
    try {
      const historyMemory = await loadExpenseHistoryMemory(company, `${year}-${month}`);
      const result = await alignExpenseEntriesWithAI(entries, accounts, closingDate(month, year), historyMemory);
      setAlignedEntries(result.rows); setAlignmentUsedAI(result.usedAI);
      setAlignmentMessage(result.usedAI
        ? `A tabela de Lançamentos foi criada diretamente da Visão agrupada: ${entries.length} originais → ${result.rows.length} agrupados. Históricos já usados pela empresa foram reaproveitados primeiro; a IA atuou apenas nos grupos ainda sem padrão.`
        : `A tabela de Lançamentos foi criada diretamente da Visão agrupada: ${entries.length} originais → ${result.rows.length} agrupados. Como a IA ficou indisponível, os históricos existentes foram preservados/padronizados sem alterar contas ou valores.`);
      onStatusChange?.("review");
    } catch (error) {
      setAlignmentMessage(error instanceof Error ? error.message : "Não foi possível gerar os lançamentos a partir da Visão agrupada.");
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
      const rebuiltResolved = { ...rebuilt, entries: applyChart(rebuilt.entries), alignedEntries: [], alignmentUsedAI: false, alignmentVersion: EXPENSE_ALIGNMENT_VERSION };
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
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><h3 className="font-semibold">Despesas de {competence}</h3><Button variant="outline" disabled={reading || (loaded && !accounts.length)} onClick={() => fileInput.current?.click()}>{reading ? "Lendo arquivo..." : `Importar despesas de ${competence}`}</Button><input ref={fileInput} type="file" multiple accept=".xlsx,.xls,.csv" className="sr-only" onChange={readFiles}/></div>
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5"><Tabs value={view} onValueChange={setView}><TabsList><TabsTrigger value="detalhada">Visão detalhada</TabsTrigger><TabsTrigger value="agrupada">Visão agrupada</TabsTrigger><TabsTrigger value="leitura">Conferência da leitura</TabsTrigger></TabsList></Tabs>{view === "agrupada" && <div className="rounded-md bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">Agrupa somente quando Débito + Crédito + centros de custo são iguais.</div>}</div>
          {view === "detalhada" && <LedgerTable rows={entries} editable editingId={editingEntryId} onEdit={setEditingEntryId} onCancelEdit={() => setEditingEntryId(null)} onUpdate={updateEntry} onDelete={deleteEntry}/>} {view === "agrupada" && <LedgerTable rows={displayGrouped}/>} {view === "leitura" && <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3"><Stat label="Lançamentos válidos" value={entries.length}/><Stat label="Linhas com problema" value={issues.length}/><Stat label="Linhas informativas" value={ignoredRows}/><Stat label="Fora da competência" value={outside}/><Stat label="Contas não encontradas no plano" value={unknownAccounts}/><Stat label="Total identificado" value={currency(detailedTotal)}/>{issues.map(issue => <p key={issue.id} className="col-span-full text-sm text-muted-foreground">{issue.fileName} · linha {issue.row}: {issue.message}</p>)}</div>}
          <div className="flex flex-wrap justify-between gap-3 border-t border-border p-4 text-xs text-muted-foreground"><span>{entries.length} lançamentos originais · {currency(detailedTotal)}</span><span>Visão agrupada é apenas uma prévia; não altera o original.</span></div>
        </div>
      </TabsContent>

      <TabsContent value="lancamentos" className="mt-6">
        <div className="rounded-md border border-border bg-background">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4"><div><h3 className="font-semibold">Lançamentos para o Calima</h3><p className="mt-1 text-xs text-muted-foreground">Ao agrupar, esta tabela copia exatamente a Visão agrupada. A única mudança automática é o Histórico variável.</p></div><div className="flex gap-2"><Button variant="outline" disabled={!entries.length || aligning} onClick={() => void alignWithAI()}>{aligning ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Agrupando...</> : <>Agrupar lançamentos</>}</Button>{alignedEntries.length > 0 && <Button variant="outline" onClick={() => { setAlignedEntries([]); setAlignmentUsedAI(false); setAlignmentMessage("Versão agrupada descartada. O original do Calima voltou a ser usado."); }}>Usar original</Button>}<Button disabled={!canExport} onClick={() => exportGroupedExpenses(exportRows, competence)}>Exportar para o Calima</Button></div></div>
          {alignmentMessage && <div className="border-b border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">{alignmentMessage}</div>}
          <LedgerTable rows={exportRows} editable editingId={editingEntryId} onEdit={setEditingEntryId} onCancelEdit={() => setEditingEntryId(null)} onUpdate={alignedEntries.length ? updateAlignedEntry : updateEntry} onDelete={alignedEntries.length ? deleteAlignedEntry : deleteEntry}/>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border p-4 text-xs text-muted-foreground"><div className="flex flex-wrap gap-4"><span>{alignedEntries.length ? `${entries.length} originais → ${alignedEntries.length} agrupados` : `${entries.length} lançamentos originais`}</span><span>Total: {currency(exportTotal)}</span>{alignedEntries.length > 0 && <span>{alignmentUsedAI ? "Históricos revisados com IA" : "Históricos padronizados sem alterar valores/contas de despesa"}</span>}</div><Button type="button" variant="outline" size="icon" className="h-9 w-9" disabled={!canExport} onClick={() => exportGroupedExpenses(exportRows, competence)} title="Exportar para o Calima" aria-label="Exportar para o Calima"><Download className="h-4 w-4" /></Button></div>
        </div>
      </TabsContent>

      <TabsContent value="conferencia" className="mt-6"><div className="flex flex-col gap-5 rounded-md border border-border bg-background p-5 sm:flex-row sm:items-center sm:justify-between"><div className="grid flex-1 gap-4 sm:grid-cols-4"><Stat label="Documento" value={currency(detailedTotal)}/><Stat label="Para exportação" value={currency(exportTotal)}/><Stat label="Diferença" value={currency(exportTotal-detailedTotal)}/><Stat label="Pendências reais" value={issues.length+outside}/></div><div className="flex flex-col items-start gap-1"><Button onClick={() => onStatusChange?.("done")}>Marcar despesas como OK</Button>{!canConfirm && <span className="text-xs text-muted-foreground">{!entries.length ? "Nenhum lançamento disponível." : issues.length ? `${issues.length} pendência(s) de importação.` : outside ? `${outside} lançamento(s) em outra competência.` : unknownAccounts ? `${unknownAccounts} lançamento(s) com conta fora do plano.` : "Revise as pendências."}</span>}</div></div></TabsContent>
    </Tabs>

    <Dialog open={Boolean(competenceWarning)} onOpenChange={open => !open && setCompetenceWarning(null)}><DialogContent><DialogHeader><DialogTitle>Competência diferente do documento</DialogTitle><DialogDescription>Você está trabalhando em {competence}, mas o arquivo pertence a {competenceWarning?.month}/{competenceWarning?.year}.</DialogDescription></DialogHeader><p className="text-sm text-muted-foreground">Nada foi salvo ainda. Ao continuar, os dados serão gravados na competência correta do documento e você será levado automaticamente até ela.</p><DialogFooter><Button variant="outline" onClick={() => { setCompetenceWarning(null); setPending(null); setPendingFiles([]); }}>Excluir importação</Button><Button onClick={() => competenceWarning && void confirm(competenceWarning)}>Manter em {competenceWarning?.month}/{competenceWarning?.year}</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}

function Stat({ label, value }: { label: string; value: string | number }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold tabular-nums">{value}</p></div>; }
