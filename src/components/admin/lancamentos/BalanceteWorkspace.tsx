import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Maximize2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAccountingCompany } from "@/hooks/lancamentos/useAccountingCompany";
import { exportAccountingWorkbook } from "@/lib/lancamentos/accountingExportWorkbook";
import { buildClosingTargets, buildTrialBalanceAdjustments, TrialBalanceClosingTarget } from "@/lib/lancamentos/trialBalanceClosing";
import { signedBalance, trialBalanceDepth, TrialBalanceResult, TrialBalanceRow, validateTrialBalanceRow } from "@/lib/lancamentos/trialBalance";
import { clearWorkspaceFiles, deleteWorkspaceData, loadWorkspaceData, loadWorkspaceFiles, saveWorkspaceData, saveWorkspaceFiles } from "@/lib/lancamentos/workspaceStorage";
import { cn } from "@/lib/utils";
import { AccountingWorkflowSteps } from "./AccountingWorkflowUI";
import { AccountingYearPicker } from "./AccountingYearPicker";
import { CompanySelector } from "./CompanySelector";

const months = [
  ["01", "Janeiro"], ["02", "Fevereiro"], ["03", "Março"], ["04", "Abril"], ["05", "Maio"], ["06", "Junho"],
  ["07", "Julho"], ["08", "Agosto"], ["09", "Setembro"], ["10", "Outubro"], ["11", "Novembro"], ["12", "Dezembro"],
] as const;

interface PendingImport { result: TrialBalanceResult; files: File[]; }
interface TargetValue { amountInCents: number; nature: "D" | "C"; }

const contextKey = (company: string) => `ws:balancete:last-context:${company}`;
const money = (cents: number) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
const balanceLabel = (signed: number) => signed === 0 ? "0,00" : `${money(Math.abs(signed))} ${signed > 0 ? "D" : "C"}`;
const toTargetValue = (signed: number): TargetValue => ({ amountInCents: Math.abs(signed), nature: signed < 0 ? "C" : "D" });
const fromTargetValue = (value: TargetValue) => value.nature === "C" ? -Math.abs(value.amountInCents) : Math.abs(value.amountInCents);

export function BalanceteWorkspace() {
  const today = new Date();
  const { company, companies, selectCompany } = useAccountingCompany();
  const savedContext = readContext(company.id);
  const [year, setYear] = useState(savedContext?.year ?? String(today.getFullYear()));
  const [month, setMonth] = useState(savedContext?.month ?? String(today.getMonth() + 1).padStart(2, "0"));
  const [activeTab, setActiveTab] = useState(savedContext?.tab ?? "balancete");
  const [result, setResult] = useState<TrialBalanceResult | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [targets, setTargets] = useState<TrialBalanceClosingTarget[]>([]);
  const [targetValues, setTargetValues] = useState<Record<string, TargetValue>>({});
  const [closingLoaded, setClosingLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousCompany = useRef(company.id);

  const competence = `${month}/${year}`;
  const scope = `${company.id}:${year}:${month}:balancete`;
  const dataKey = `${scope}:parsed`;
  const targetKey = `${scope}:closing-targets`;
  const monthLabel = months.find(item => item[0] === month)?.[1] ?? month;

  useEffect(() => {
    if (previousCompany.current === company.id) return;
    previousCompany.current = company.id;
    const saved = readContext(company.id);
    setYear(saved?.year ?? String(today.getFullYear()));
    setMonth(saved?.month ?? String(today.getMonth() + 1).padStart(2, "0"));
    setActiveTab(saved?.tab ?? "balancete");
  }, [company.id, today]);

  useEffect(() => {
    localStorage.setItem(contextKey(company.id), JSON.stringify({ year, month, tab: activeTab }));
  }, [activeTab, company.id, month, year]);

  useEffect(() => {
    let active = true;
    setClosingLoaded(false);
    Promise.all([
      loadWorkspaceData<TrialBalanceResult>(dataKey),
      loadWorkspaceFiles(scope),
      loadWorkspaceData<Record<string, TargetValue>>(targetKey),
    ]).then(async ([saved, docs, savedTargets]) => {
      if (!active) return;
      setResult(saved ?? null);
      setFiles(docs);
      if (saved?.rows?.length) {
        const nextTargets = await buildClosingTargets(company.id, month, year, saved.rows);
        if (!active) return;
        setTargets(nextTargets);
        setTargetValues(Object.fromEntries(nextTargets.map(target => [target.key, savedTargets?.[target.key] ?? toTargetValue(target.suggestedSignedInCents)])));
      } else {
        setTargets([]); setTargetValues({});
      }
      setClosingLoaded(true);
    });
    return () => { active = false; };
  }, [company.id, dataKey, month, scope, targetKey, year]);

  useEffect(() => {
    if (!closingLoaded || !Object.keys(targetValues).length) return;
    void saveWorkspaceData(targetKey, targetValues);
  }, [closingLoaded, targetKey, targetValues]);

  const signedTargets = useMemo(() => Object.fromEntries(Object.entries(targetValues).map(([key, value]) => [key, fromTargetValue(value)])), [targetValues]);
  const closing = useMemo(() => buildTrialBalanceAdjustments(targets, signedTargets, competence), [competence, signedTargets, targets]);
  const arithmeticIssues = useMemo(() => result?.rows.filter(row => Math.abs(validateTrialBalanceRow(row)) > 1) ?? [], [result]);
  const conferenceCount = (result?.warnings.length ?? 0) + (result?.validationIssues.length ?? 0) + arithmeticIssues.length;

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selected.length) return;
    setProcessing(true); setStartedAt(Date.now());
    try {
      const documents = await Promise.all(selected.map(async file => ({ name: file.name, mime_type: file.type || "application/pdf", data: await asBase64(file) })));
      const { data, error } = await supabase.functions.invoke("process-trial-balance-document", { body: { company_id: company.id, documents } });
      if (error) throw await functionError(error, "Falha ao ler o Balancete do Calima.");
      if (!Array.isArray(data?.rows) || !data.competence) throw new Error("O balancete não devolveu linhas estruturadas.");
      const parsed = data as TrialBalanceResult;
      if (parsed.competence !== competence) {
        setPending({ result: parsed, files: selected });
      } else {
        await persistImport(parsed, selected);
      }
    } catch (error) {
      setResult({ competence, companyName: company.name, rows: [], warnings: [], validationIssues: [error instanceof Error ? error.message : "Falha ao importar o balancete."], validated: false, processingMeta: { model: "", routing: "" } });
    } finally {
      setProcessing(false); setStartedAt(null);
    }
  };

  const persistImport = async (parsed: TrialBalanceResult, selected: File[]) => {
    const [targetMonth, targetYear] = parsed.competence.split("/");
    const targetScope = `${company.id}:${targetYear}:${targetMonth}:balancete`;
    await saveWorkspaceFiles(targetScope, selected, { skipCompetencePrompt: true });
    await saveWorkspaceData(`${targetScope}:parsed`, parsed);
    if (targetMonth === month && targetYear === year) {
      setResult(parsed); setFiles(await loadWorkspaceFiles(targetScope));
      const nextTargets = await buildClosingTargets(company.id, targetMonth, targetYear, parsed.rows);
      setTargets(nextTargets);
      setTargetValues(Object.fromEntries(nextTargets.map(target => [target.key, toTargetValue(target.suggestedSignedInCents)])));
      setActiveTab("balancete");
    } else {
      setYear(targetYear); setMonth(targetMonth);
    }
  };

  const keepDetected = async () => {
    if (!pending) return;
    const current = pending;
    setPending(null);
    await persistImport(current.result, current.files);
  };

  const clearImport = async () => {
    await clearWorkspaceFiles(scope);
    await deleteWorkspaceData(dataKey);
    await deleteWorkspaceData(targetKey);
    setResult(null); setFiles([]); setTargets([]); setTargetValues({});
  };

  const updateTargetAmount = (key: string, text: string) => {
    const digits = text.replace(/\D/g, "");
    setTargetValues(current => ({ ...current, [key]: { ...(current[key] ?? { nature: "D" as const }), amountInCents: Number(digits || 0) } }));
  };
  const toggleNature = (key: string) => setTargetValues(current => ({ ...current, [key]: { ...(current[key] ?? { amountInCents: 0 }), nature: current[key]?.nature === "C" ? "D" : "C" } }));

  const exportAdjustments = () => {
    if (!result || !closing.adjustments.length) return;
    const comparisons = targets.filter(target => target.key !== "cash").map(target => {
      const targetSigned = signedTargets[target.key] ?? target.suggestedSignedInCents;
      return {
        label: `${target.label} · C.R. ${target.row.reducedCode}`,
        documentAmountInCents: Math.abs(target.currentSignedInCents),
        entriesAmountInCents: Math.abs(targetSigned),
        differenceInCents: Math.abs(targetSigned) - Math.abs(target.currentSignedInCents),
        source: target.source,
        blocking: false,
        note: `Atual: ${balanceLabel(target.currentSignedInCents)} → alvo: ${balanceLabel(targetSigned)}`,
      };
    });
    exportAccountingWorkbook({
      moduleTitle: "Ajustes do Balancete",
      competence,
      fileName: `ajustes-balancete-${year}-${month}.xlsx`,
      entries: closing.adjustments,
      comparisons,
      note: `Ajustes propostos a partir do Balancete do Calima. Caixa projetado após os ajustes: ${closing.projectedCashSignedInCents === null ? "não localizado" : balanceLabel(closing.projectedCashSignedInCents)}. Revise os saldos-alvo antes de importar no Calima.`,
    });
  };

  return <div className="mx-auto w-full max-w-[1720px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
    <header className="flex flex-col gap-4 border-b border-border pb-5 xl:flex-row xl:items-end xl:justify-between">
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Fechamento contábil</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Balancete</h1><p className="mt-1 text-sm text-muted-foreground">{company.name}<span className="px-2 text-border">/</span>{monthLabel} de {year}</p></div>
      <CompanySelector company={company} companies={companies} onSelect={selectCompany} />
    </header>

    <div className="grid min-h-[720px] lg:grid-cols-[236px_minmax(0,1fr)]">
      <aside className="border-b border-border py-5 lg:sticky lg:top-0 lg:h-screen lg:self-start lg:border-b-0 lg:border-r lg:pr-4">
        <div className="mb-3 flex items-center justify-between gap-2"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-300">Competência</p><AccountingYearPicker value={year} onChange={setYear} /></div>
        <nav className="grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-1">{months.map(([key, label]) => <button key={key} type="button" onClick={() => setMonth(key)} className={cn("rounded-sm px-3 py-2 text-left text-sm transition-colors", key === month ? "bg-cyan-500/15 text-cyan-800 dark:text-cyan-200" : "text-cyan-700/80 hover:bg-cyan-500/10 dark:text-cyan-300/75")}><span className="flex items-center justify-between"><span>{label}</span>{key === month && result?.rows.length ? <span className={cn("h-2 w-2 rounded-full", result.validated ? "bg-emerald-500" : "bg-amber-400")} /> : null}</span></button>)}</nav>
      </aside>

      <main className="min-w-0 py-5 lg:pl-6">
        <section className="rounded-md border border-border bg-background p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-semibold">Balancete do Calima · {competence}</h2><p className="mt-1 text-xs text-muted-foreground">Importe o Balancete Acumulado Analítico depois de lançar a competência no Calima.</p></div><div className="flex gap-2">{files.length > 0 && <Button variant="outline" onClick={() => void clearImport()}><Trash2 className="mr-2 h-4 w-4" />Excluir balancete</Button>}<Button variant="outline" disabled={processing} onClick={() => inputRef.current?.click()}>{processing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Lendo...</> : <><FileSpreadsheet className="mr-2 h-4 w-4" />Importar balancete</>}</Button></div><input ref={inputRef} type="file" accept=".pdf" className="sr-only" onChange={event => void importFile(event)} /></div>
          <div className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">{files.length ? files.map(file => <span key={`${file.name}-${file.size}`} className="mr-4 text-foreground">{file.name}</span>) : "Nenhum balancete importado nesta competência."}</div>
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
          <AccountingWorkflowSteps steps={[{ value: "balancete", label: "Balancete", count: result?.rows.length ?? 0 }, { value: "fechamento", label: "Fechamento", count: closing.adjustments.length }, { value: "conferencia", label: "Conferência", count: conferenceCount }]} />

          <TabsContent value="balancete" className="mt-6"><div className="mb-4 flex items-end justify-between gap-3"><div><h3 className="text-base font-semibold">Visão hierárquica</h3><p className="mt-1 text-sm text-muted-foreground">Grupos, subgrupos e contas preservados na mesma estrutura do Balancete Analítico do Calima.</p></div>{result?.rows.length ? <Button variant="ghost" size="icon" onClick={() => setExpanded(true)} title="Expandir balancete"><Maximize2 className="h-4 w-4" /></Button> : null}</div>{result?.rows.length ? <TrialBalanceTable rows={result.rows} /> : <Empty text="Importe o Balancete do Calima para visualizar as contas." />}</TabsContent>

          <TabsContent value="fechamento" className="mt-6"><div className="mb-4"><h3 className="text-base font-semibold">Fechamento e saldos-alvo</h3><p className="mt-1 text-sm text-muted-foreground">Os alvos automáticos vêm dos módulos já conferidos. Clientes e Fornecedores permanecem editáveis porque a política de recebimento/pagamento varia por empresa.</p></div>{targets.length ? <div className="space-y-5"><div className="overflow-x-auto rounded-md border border-border"><table className="w-full min-w-[980px] text-xs"><thead className="bg-muted/50 text-left text-[11px] text-muted-foreground"><tr><th className="px-3 py-2">Conta</th><th className="px-3 py-2">C.R.</th><th className="px-3 py-2 text-right">Saldo atual</th><th className="px-3 py-2">Saldo-alvo</th><th className="px-3 py-2">Origem / critério</th><th className="px-3 py-2 text-right">Ajuste</th></tr></thead><tbody>{targets.map(target => { const value = targetValues[target.key] ?? toTargetValue(target.suggestedSignedInCents); const targetSigned = fromTargetValue(value); const delta = targetSigned - target.currentSignedInCents; return <tr key={target.key} className="border-t border-border"><td className="px-3 py-2"><p className="font-medium">{target.label}</p><p className="text-[10px] text-muted-foreground">{target.row.title}</p></td><td className="px-3 py-2 tabular-nums">{target.row.reducedCode}</td><td className="px-3 py-2 text-right tabular-nums">{balanceLabel(target.currentSignedInCents)}</td><td className="px-3 py-2"><div className="flex items-center gap-1"><Input className="h-8 w-32 text-right text-xs tabular-nums" value={money(value.amountInCents)} onChange={event => updateTargetAmount(target.key, event.target.value)} /><Button type="button" variant="outline" size="sm" className="h-8 w-10 px-0" onClick={() => toggleNature(target.key)}>{value.nature}</Button></div></td><td className="max-w-[360px] px-3 py-2 text-muted-foreground">{target.source}{target.requiresManualReview ? <span className="ml-1 font-medium text-amber-700 dark:text-amber-300">· revisar</span> : <span className="ml-1 text-emerald-600 dark:text-emerald-400">· sugerido</span>}</td><td className={cn("px-3 py-2 text-right tabular-nums", delta !== 0 && "font-medium")}>{delta === 0 ? "—" : balanceLabel(delta)}</td></tr>; })}</tbody></table></div><div className="grid gap-4 rounded-md border border-border bg-muted/20 p-5 sm:grid-cols-3"><Stat label="Ajustes propostos" value={closing.adjustments.length} /><Stat label="Caixa atual" value={targets.find(target => target.key === "cash") ? balanceLabel(targets.find(target => target.key === "cash")!.currentSignedInCents) : "Não localizado"} /><Stat label="Caixa projetado" value={closing.projectedCashSignedInCents === null ? "Não localizado" : balanceLabel(closing.projectedCashSignedInCents)} /></div><div className="flex justify-end"><Button disabled={!result?.validated || !closing.adjustments.length} onClick={exportAdjustments}>Exportar ajustes para o Calima</Button></div></div> : <Empty text="Importe e valide o balancete para preparar o fechamento." />}</TabsContent>

          <TabsContent value="conferencia" className="mt-6"><div className="rounded-md border border-border bg-background"><div className="flex flex-col gap-3 border-b border-border bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-semibold">Conferência do balancete</h3><p className="mt-1 text-xs text-muted-foreground">Cada linha é validada matematicamente antes de qualquer ajuste ser exportado.</p></div>{result?.validated ? <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" />Balancete confere</span> : <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-300"><AlertTriangle className="h-4 w-4" />Revisão necessária</span>}</div><div className="grid gap-4 p-5 sm:grid-cols-4"><Stat label="Linhas" value={result?.rows.length ?? 0} /><Stat label="Erros aritméticos" value={arithmeticIssues.length} /><Stat label="Avisos" value={result?.warnings.length ?? 0} /><Stat label="Pendências" value={result?.validationIssues.length ?? 0} /></div>{result && (result.validationIssues.length > 0 || result.warnings.length > 0) && <div className="border-t border-border p-5">{[...new Set([...result.validationIssues, ...result.warnings])].map(issue => <p key={issue} className="mt-2 flex gap-2 text-sm text-muted-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{issue}</p>)}</div>}{result?.processingMeta.routing && <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">Fluxo: {result.processingMeta.routing}</p>}</div></TabsContent>
        </Tabs>
      </main>
    </div>

    <Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="max-h-[92vh] w-[97vw] max-w-[1660px] overflow-hidden p-0"><DialogHeader className="border-b border-border px-6 py-5"><DialogTitle>Balancete Analítico · {competence}</DialogTitle></DialogHeader><div className="max-h-[80vh] overflow-auto">{result?.rows ? <TrialBalanceTable rows={result.rows} /> : null}</div></DialogContent></Dialog>

    <Dialog open={Boolean(pending)} onOpenChange={open => !open && setPending(null)}><DialogContent><DialogHeader><DialogTitle>Competência diferente do balancete</DialogTitle><DialogDescription>Você está em {competence}, mas o campo Ref. do documento indica {pending?.result.competence}.</DialogDescription></DialogHeader><p className="text-sm text-muted-foreground">O balancete será guardado somente na competência identificada no próprio Calima.</p><DialogFooter><Button variant="outline" onClick={() => setPending(null)}>Excluir esta importação</Button><Button onClick={() => void keepDetected()}>Manter em {pending?.result.competence}</Button></DialogFooter></DialogContent></Dialog>

    {processing && startedAt ? <ProcessingPopup startedAt={startedAt} /> : null}
  </div>;
}

function TrialBalanceTable({ rows }: { rows: TrialBalanceRow[] }) {
  return <div className="overflow-x-auto rounded-md border border-border bg-background"><table className="w-full min-w-[1060px] border-collapse text-xs"><thead className="sticky top-0 z-10 bg-muted text-left text-[11px] text-muted-foreground"><tr><th className="w-[16%] border-b border-r border-border px-3 py-2">Conta</th><th className="w-[30%] border-b border-r border-border px-3 py-2">Título</th><th className="w-[9%] border-b border-r border-border px-3 py-2">C.R.</th><th className="w-[13%] border-b border-r border-border px-3 py-2 text-right">Saldo ant.</th><th className="w-[11%] border-b border-r border-border px-3 py-2 text-right">Débito</th><th className="w-[11%] border-b border-r border-border px-3 py-2 text-right">Crédito</th><th className="w-[13%] border-b border-border px-3 py-2 text-right">Saldo atual</th></tr></thead><tbody>{rows.map(row => { const depth = trialBalanceDepth(row.accountCode); const difference = validateTrialBalanceRow(row); return <tr key={row.id} className={cn("border-b border-border", depth === 0 && "bg-foreground/[0.055] font-semibold", depth === 1 && "bg-muted/60 font-semibold", depth === 2 && "bg-muted/25 font-medium")}><td className="border-r border-border px-3 py-2 tabular-nums">{row.accountCode}</td><td className="border-r border-border px-3 py-2" style={{ paddingLeft: `${12 + depth * 16}px` }}><span title={row.title}>{row.title}</span>{Math.abs(difference) > 1 ? <AlertTriangle className="ml-2 inline h-3.5 w-3.5 text-destructive" /> : null}</td><td className="border-r border-border px-3 py-2 tabular-nums">{row.reducedCode}</td><td className="border-r border-border px-3 py-2 text-right tabular-nums">{row.previousBalanceInCents ? `${money(row.previousBalanceInCents)} ${row.previousNature}` : "0,00"}</td><td className="border-r border-border px-3 py-2 text-right tabular-nums">{money(row.debitInCents)}</td><td className="border-r border-border px-3 py-2 text-right tabular-nums">{money(row.creditInCents)}</td><td className="px-3 py-2 text-right font-medium tabular-nums">{row.currentBalanceInCents ? `${money(row.currentBalanceInCents)} ${row.currentNature}` : "0,00"}</td></tr>; })}</tbody></table></div>;
}

function Stat({ label, value }: { label: string; value: string | number }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold tabular-nums">{value}</p></div>; }
function Empty({ text }: { text: string }) { return <div className="grid h-44 place-items-center rounded-md border border-border text-center text-sm text-muted-foreground">{text}</div>; }
function ProcessingPopup({ startedAt }: { startedAt: number }) { const [, tick] = useState(0); useEffect(() => { const id = window.setInterval(() => tick(value => value + 1), 1000); return () => window.clearInterval(id); }, []); const seconds = Math.floor((Date.now() - startedAt) / 1000); return <div className="fixed bottom-5 right-5 z-[100] w-[min(360px,calc(100vw-2rem))] rounded-lg border border-border bg-background p-4 shadow-2xl"><div className="flex gap-3"><Loader2 className="mt-0.5 h-5 w-5 animate-spin" /><div><p className="text-sm font-semibold">Lendo balancete</p><p className="mt-1 text-xs text-muted-foreground">Você pode continuar navegando enquanto o documento é processado.</p><p className="mt-2 text-xs tabular-nums text-muted-foreground">Tempo decorrido: {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</p></div></div></div>; }

function readContext(company: string) { try { const raw = localStorage.getItem(contextKey(company)); if (!raw) return null; const value = JSON.parse(raw) as { year?: string; month?: string; tab?: string }; return value.year && value.month ? { year: value.year, month: value.month, tab: value.tab || "balancete" } : null; } catch { return null; } }
function asBase64(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] || ""); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); }); }
async function functionError(error: unknown, fallback: string) { let message = error instanceof Error ? error.message : fallback; try { const context = (error as { context?: Response }).context; if (context) { const payload = await context.clone().json(); message = payload?.error || message; } } catch { /* preserve original */ } return new Error(message); }
