import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleAlert, FileSpreadsheet, Loader2, Maximize2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useAccountingProcessing } from "@/contexts/AccountingProcessingContext";
import { supabase } from "@/integrations/supabase/client";
import { useAccountingCompany } from "@/hooks/lancamentos/useAccountingCompany";
import { exportAccountingWorkbook } from "@/lib/lancamentos/accountingExportWorkbook";
import {
  buildCriticalTrialBalancePlan,
  CriticalTrialBalancePlan,
  criticalTrialBalancePlanIsCorrected,
} from "@/lib/lancamentos/trialBalanceCriticalCorrection";
import { TrialBalanceObservation } from "@/lib/lancamentos/trialBalanceAutoAdjustment";
import {
  analyticalTrialBalanceRows,
  summarizeTrialBalance,
  trialBalanceDepth,
  TrialBalanceResult,
  TrialBalanceRow,
  validateTrialBalanceRow,
} from "@/lib/lancamentos/trialBalance";
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
interface MonthState { hasData: boolean; issues: number; corrected: boolean; conferenceOk: boolean; }
interface SavedContext { year: string; month: string; tab: string; }

const contextKey = (company: string) => `ws:balancete:last-context:${company}`;
const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Math.abs(cents) / 100);
const balance = (signed: number) => Math.abs(signed) <= 1 ? "R$ 0,00" : `${money(signed)} ${signed > 0 ? "D" : "C"}`;
const previousBalancesAreVerified = (result: TrialBalanceResult | null) => Boolean(result?.rows.length && result.rows.every(row => row.previousBalanceRead === true));

export function BalanceteWorkspaceV2() {
  const today = new Date();
  const { company, companies, selectCompany } = useAccountingCompany();
  const { processTrialBalance } = useAccountingProcessing();
  const initial = readContext(company.id);
  const [year, setYear] = useState(initial?.year ?? String(today.getFullYear()));
  const [month, setMonth] = useState(initial?.month ?? String(today.getMonth() + 1).padStart(2, "0"));
  const [activeTab, setActiveTab] = useState(initial?.tab ?? "balancete");
  const [result, setResult] = useState<TrialBalanceResult | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [analysis, setAnalysis] = useState<CriticalTrialBalancePlan | null>(null);
  const [plan, setPlan] = useState<CriticalTrialBalancePlan | null>(null);
  const [conferenceOk, setConferenceOk] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [expanded, setExpanded] = useState<"original" | "preview" | null>(null);
  const [yearStates, setYearStates] = useState<Record<string, MonthState>>({});
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousCompany = useRef(company.id);

  const competence = `${month}/${year}`;
  const scope = `${company.id}:${year}:${month}:balancete`;
  const dataKey = `${scope}:parsed`;
  const planKey = `${scope}:auto-plan`;
  const conferenceKey = `${scope}:conference-ok`;
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
    localStorage.setItem(contextKey(company.id), JSON.stringify({ year, month, tab: activeTab } satisfies SavedContext));
  }, [activeTab, company.id, month, year]);

  const refreshYearStates = useCallback(async () => {
    const entries = await Promise.all(months.map(async ([key]) => {
      const prefix = `${company.id}:${year}:${key}:balancete`;
      const [saved, savedPlan, ok] = await Promise.all([
        loadWorkspaceData<TrialBalanceResult>(`${prefix}:parsed`),
        loadWorkspaceData<CriticalTrialBalancePlan>(`${prefix}:auto-plan`),
        loadWorkspaceData<boolean>(`${prefix}:conference-ok`),
      ]);
      const corrected = criticalTrialBalancePlanIsCorrected(savedPlan);
      const issues = savedPlan
        ? (savedPlan.remainingCriticalObservations?.length ?? 0) + (savedPlan.referenceIssues?.length ?? 0)
        : (saved?.validationIssues.length ?? 0) + (saved?.rows.filter(row => Math.abs(validateTrialBalanceRow(row)) > 10_000).length ?? 0);
      return [key, { hasData: Boolean(saved?.rows?.length), issues, corrected, conferenceOk: Boolean(ok && corrected) }] as const;
    }));
    setYearStates(Object.fromEntries(entries));
  }, [company.id, year]);

  useEffect(() => { void refreshYearStates(); }, [refreshYearStates]);

  useEffect(() => {
    const channel = supabase.channel(`balancete-v2-${company.id}-${year}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "accounting_workspace_data", filter: `company_key=eq.${company.id}` }, () => void refreshYearStates())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [company.id, refreshYearStates, year]);

  useEffect(() => {
    let active = true;
    setAnalysis(null);
    setError(null);
    Promise.all([
      loadWorkspaceData<TrialBalanceResult>(dataKey),
      loadWorkspaceFiles(scope),
      loadWorkspaceData<CriticalTrialBalancePlan>(planKey),
      loadWorkspaceData<boolean>(conferenceKey),
    ]).then(async ([saved, docs, savedPlan, savedOk]) => {
      if (!active) return;
      setResult(saved ?? null);
      setFiles(docs);
      setPlan(savedPlan ?? null);
      setConferenceOk(Boolean(savedOk && criticalTrialBalancePlanIsCorrected(savedPlan)));
      if (saved?.rows?.length && previousBalancesAreVerified(saved)) {
        try {
          const nextAnalysis = await buildCriticalTrialBalancePlan(company.id, month, year, saved.rows);
          if (active) setAnalysis(nextAnalysis);
        } catch (reason) {
          if (active) setError(reason instanceof Error ? reason.message : "Falha ao analisar o balancete.");
        }
      }
    });
    return () => { active = false; };
  }, [company.id, conferenceKey, dataKey, month, planKey, scope, year]);

  const previousBalanceVerified = previousBalancesAreVerified(result);
  const observations = (analysis?.observations ?? []).filter(item => item.severity === "critical");
  const observationMap = useMemo(() => groupObservations(observations), [observations]);
  const previewObservationMap = useMemo(() => groupObservations(plan?.remainingCriticalObservations ?? []), [plan]);
  const previewSummary = useMemo(() => summarizeTrialBalance(plan?.previewRows ?? []), [plan]);
  const planConferable = criticalTrialBalancePlanIsCorrected(plan);
  const criticalOriginal = observations.length;

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selected.length) return;
    setProcessing(true); setError(null);
    try {
      const parsed = await processTrialBalance({ company: company.id, month, year, files: selected, operation: "import" });
      if (!parsed.previousBalanceVerified) throw new Error(`A coluna SALDO ANT não foi confirmada em todas as linhas (${parsed.previousBalanceReadCount ?? 0}/${parsed.rows.length}). A importação foi interrompida para não calcular o fechamento com dados incompletos.`);
      if (parsed.competence !== competence) setPending({ result: parsed, files: selected });
      else await persistImport(parsed, selected);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao importar o balancete.");
    } finally { setProcessing(false); }
  };

  const persistImport = async (parsed: TrialBalanceResult, selected: File[]) => {
    const [targetMonth, targetYear] = parsed.competence.split("/");
    const targetScope = `${company.id}:${targetYear}:${targetMonth}:balancete`;
    await saveWorkspaceFiles(targetScope, selected, { skipCompetencePrompt: true });
    await saveWorkspaceData(`${targetScope}:parsed`, parsed);
    await deleteWorkspaceData(`${targetScope}:auto-plan`);
    await deleteWorkspaceData(`${targetScope}:conference-ok`);
    if (targetMonth !== month || targetYear !== year) {
      setYear(targetYear); setMonth(targetMonth); setActiveTab("balancete");
      return;
    }
    setResult(parsed);
    setFiles(await loadWorkspaceFiles(targetScope));
    setPlan(null); setConferenceOk(false);
    const nextAnalysis = await buildCriticalTrialBalancePlan(company.id, targetMonth, targetYear, parsed.rows);
    setAnalysis(nextAnalysis);
    setActiveTab("balancete");
    await refreshYearStates();
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
    await deleteWorkspaceData(planKey);
    await deleteWorkspaceData(conferenceKey);
    setResult(null); setFiles([]); setAnalysis(null); setPlan(null); setConferenceOk(false); setError(null);
    await refreshYearStates();
  };

  const correctAutomatically = async () => {
    if (!result?.rows.length) return;
    if (!previousBalanceVerified) {
      setError("Este balancete foi salvo por uma versão antiga que não confirmou a coluna SALDO ANT. Reimporte o PDF antes de gerar qualquer correção.");
      return;
    }
    setCorrecting(true); setError(null); setConferenceOk(false);
    try {
      const nextPlan = await buildCriticalTrialBalancePlan(company.id, month, year, result.rows);
      setPlan(nextPlan);
      await saveWorkspaceData(planKey, nextPlan);
      await saveWorkspaceData(conferenceKey, false);
      await refreshYearStates();
      if (!nextPlan.correctionComplete) {
        const count = nextPlan.remainingCriticalObservations.length + (nextPlan.referenceIssues?.length ?? 0);
        setError(`Correção incompleta: ainda restam ${count} pendência(s) material(is). A competência NÃO foi marcada como corrigida.`);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao gerar os ajustes automáticos.");
    } finally { setCorrecting(false); }
  };

  const markConferenceOk = async () => {
    if (!planConferable) return;
    setConferenceOk(true);
    await saveWorkspaceData(conferenceKey, true);
    await refreshYearStates();
  };

  const exportAdjustments = () => {
    if (!plan || !conferenceOk || !planConferable) return;
    exportAccountingWorkbook({
      moduleTitle: "Ajustes do Balancete",
      competence,
      fileName: `ajustes-balancete-${year}-${month}.xlsx`,
      entries: plan.adjustments,
      comparisons: plan.targets.map(target => ({
        label: `${target.label} · C.R. ${target.row.reducedCode}`,
        documentAmountInCents: Math.abs(target.currentSignedInCents),
        entriesAmountInCents: Math.abs(target.targetSignedInCents),
        differenceInCents: Math.abs(target.targetSignedInCents) - Math.abs(target.currentSignedInCents),
        source: target.source,
        blocking: false,
        note: `${balance(target.currentSignedInCents)} → ${balance(target.targetSignedInCents)}`,
      })),
      note: `Ajustes do Balancete. Referência: ${plan.referenceSource || "motor de fechamento"}. A Conferência não altera saldos; apenas valida a prévia antes da exportação.`,
    });
  };

  return <div className="mx-auto w-full max-w-[1720px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
    <header className="flex flex-col gap-4 border-b border-border pb-5 xl:flex-row xl:items-end xl:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Fechamento contábil</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Balancete</h1>
        <p className="mt-1 text-sm text-muted-foreground">Importe o balancete bruto do Calima, identifique apenas inconsistências materiais e gere os lançamentos necessários para corrigi-las.</p>
      </div>
      <CompanySelector company={company} companies={companies} onSelect={selectCompany} />
    </header>

    <div className="grid min-h-[720px] lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="border-b border-border py-5 lg:sticky lg:top-0 lg:h-screen lg:self-start lg:border-b-0 lg:border-r lg:pr-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-300">Competências</p>
          <AccountingYearPicker value={year} onChange={setYear} />
        </div>
        <nav className="space-y-1">
          {months.map(([key, label]) => {
            const state = yearStates[key];
            const active = month === key;
            const dot = state?.conferenceOk ? "bg-emerald-500" : state?.corrected ? "bg-emerald-500" : state?.hasData ? "bg-muted-foreground/45" : "bg-muted-foreground/25";
            return <button key={key} type="button" onClick={() => setMonth(key)} className={cn("flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm transition-colors", active ? "bg-cyan-500/15 text-cyan-800 dark:text-cyan-200" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}>
              <span>{label}</span><span className="flex items-center gap-2"><span className="text-[10px]">{state?.conferenceOk ? "OK" : state?.corrected ? "corrigido" : state?.hasData && state.issues ? `${state.issues} crítico(s)` : ""}</span><span className={cn("h-2 w-2 rounded-full", dot)} /></span>
            </button>;
          })}
        </nav>
      </aside>

      <main className="min-w-0 py-5 lg:pl-6">
        <section className="rounded-md border border-border bg-background p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="font-semibold">{monthLabel} de {year}</h2><p className="mt-1 text-xs text-muted-foreground">O documento original fica intacto. A correção é gerada depois, em Lançamentos.</p></div>
            <div className="flex flex-wrap gap-2">
              {files.length > 0 && <Button type="button" variant="outline" onClick={() => void clearImport()}><Trash2 className="mr-2 h-4 w-4" />Excluir documento</Button>}
              <Button type="button" variant="outline" disabled={processing} onClick={() => inputRef.current?.click()}>{processing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Lendo Balancete...</> : <><FileSpreadsheet className="mr-2 h-4 w-4" />Importar Balancete</>}</Button>
              <input ref={inputRef} type="file" accept=".pdf" className="sr-only" onChange={event => void importFile(event)} />
            </div>
          </div>
          {files.length > 0 && <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">{files.map(file => <span key={`${file.name}-${file.size}`} className="mr-4 text-foreground">{file.name}</span>)}</div>}
          {result?.rows.length ? <div className={cn("mt-4 flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium", previousBalanceVerified ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-300")}>
            {previousBalanceVerified ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {previousBalanceVerified ? "Saldo Anterior confirmado linha por linha — inclusive 0,00 literal." : "Saldo Anterior não foi verificado nesta importação antiga. Reimporte o PDF antes de corrigir."}
          </div> : null}
          {error && <div className="mt-4 flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm font-medium text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
          <AccountingWorkflowSteps steps={[
            { value: "balancete", label: "Balancete", count: result?.rows.length ?? 0 },
            { value: "lancamentos", label: "Lançamentos", count: plan?.adjustments.length ?? observations.length },
            { value: "conferencia", label: "Conferência", count: conferenceOk ? 0 : (plan?.remainingCriticalObservations.length ?? 0) + (plan?.referenceIssues?.length ?? 0) || 1 },
          ]} />

          <TabsContent value="balancete" className="mt-7 space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><h3 className="font-semibold">Balancete importado</h3><p className="mt-1 text-sm text-muted-foreground">Somente problemas realmente críticos aparecem em vermelho. Diferenças pequenas e detalhes sem impacto material não recebem alerta.</p></div>
              {result?.rows.length ? <span className="rounded-md border-2 border-red-600/60 bg-red-600/20 px-3 py-1.5 text-xs font-bold text-red-800 dark:text-red-200">{criticalOriginal} CRÍTICO(S)</span> : null}
            </div>
            <TrialBalanceTable rows={result?.rows ?? []} observations={observationMap} onExpand={() => setExpanded("original")} empty="Importe um Balancete Acumulado Analítico do Calima para começar." />
          </TabsContent>

          <TabsContent value="lancamentos" className="mt-7 space-y-6">
            <div className="rounded-md border border-border bg-background p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div><h3 className="font-semibold">Correção do Balancete</h3><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Quando existe fechamento manual aprovado da competência, ele é a referência principal. Fora disso, o motor cruza módulos, pagamentos do mês anterior e a faixa de Caixa aprendida da empresa — sempre usando os C.R. existentes neste próprio Balancete.</p></div>
                <Button disabled={!result?.rows.length || correcting || !previousBalanceVerified} onClick={() => void correctAutomatically()}>{correcting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Recalculando saldos...</> : <><Sparkles className="mr-2 h-4 w-4" />Corrigir automaticamente</>}</Button>
              </div>
              {analysis?.contextSummary?.length ? <div className="mt-4 grid gap-2 border-t border-border pt-4 text-xs text-muted-foreground md:grid-cols-2">{analysis.contextSummary.map(text => <p key={text}>{text}</p>)}</div> : null}
            </div>

            {!plan ? <div className="grid min-h-52 place-items-center rounded-md border border-dashed border-border bg-muted/20 p-8 text-center"><div><Sparkles className="mx-auto h-6 w-6 text-muted-foreground" /><p className="mt-3 text-sm font-medium">Nenhuma prévia gerada ainda</p><p className="mt-1 text-xs text-muted-foreground">Clique em Corrigir automaticamente para reconstruir os lançamentos realmente ausentes.</p></div></div> : <>
              <div className="grid gap-3 sm:grid-cols-5"><Metric label="Ajustes gerados" value={String(plan.adjustments.length)} /><Metric label="Já estavam lançados" value={String(plan.referenceCoveredCount ?? 0)} /><Metric label="Críticos restantes" value={String(plan.remainingCriticalObservations.length + (plan.referenceIssues?.length ?? 0))} /><Metric label="Caixa atual" value={plan.currentCashSignedInCents === null ? "Não localizado" : balance(plan.currentCashSignedInCents)} /><Metric label="Caixa projetado" value={plan.projectedCashSignedInCents === null ? "Não localizado" : balance(plan.projectedCashSignedInCents)} /></div>

              {!plan.correctionComplete && <div className="flex gap-2 rounded-md border-2 border-red-600/50 bg-red-600/15 p-4 text-sm font-semibold text-red-800 dark:text-red-200"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />Esta prévia ainda NÃO está corrigida. Existem {plan.remainingCriticalObservations.length + (plan.referenceIssues?.length ?? 0)} pendência(s) material(is) ou a conferência matemática não fechou.</div>}
              {plan.correctionComplete && <div className="flex gap-2 rounded-md border-2 border-emerald-600/50 bg-emerald-500/15 p-4 text-sm font-semibold text-emerald-800 dark:text-emerald-200"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />A prévia reproduziu o fechamento esperado. As linhas realmente alteradas aparecem em verde forte abaixo.</div>}
              {plan.referenceIssues?.length ? <div className="rounded-md border border-red-600/40 bg-red-600/10 p-4 text-xs text-red-800 dark:text-red-200">{plan.referenceIssues.map(issue => <p key={issue}>• {issue}</p>)}</div> : null}

              <section className="overflow-hidden rounded-md border border-border bg-background">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3"><div><h4 className="text-sm font-semibold">Lançamentos de ajuste</h4><p className="mt-0.5 text-xs text-muted-foreground">Só aparecem lançamentos ausentes. O que já existe no Balancete não é duplicado.</p></div><Button disabled={!conferenceOk || !planConferable || !plan.adjustments.length} onClick={exportAdjustments}>Exportar ajustes para o Calima</Button></div>
                <div className="overflow-x-auto"><table className="w-full min-w-[1140px] table-fixed text-xs"><thead className="bg-muted/50 text-left text-[11px] text-muted-foreground"><tr><th className="w-[9%] border-b border-r border-border px-2 py-2">Data</th><th className="w-[29%] border-b border-r border-border px-2 py-2">Histórico</th><th className="w-[8%] border-b border-r border-border px-2 py-2">Débito</th><th className="w-[7%] border-b border-r border-border px-2 py-2">C.C. D.</th><th className="w-[8%] border-b border-r border-border px-2 py-2">Crédito</th><th className="w-[7%] border-b border-r border-border px-2 py-2">C.C. C.</th><th className="w-[13%] border-b border-r border-border px-2 py-2 text-right">Valor</th><th className="w-[19%] border-b border-border px-2 py-2">Motivo</th></tr></thead><tbody>{plan.adjustments.map(row => <tr key={`${row.targetKey}-${row.debitCode}-${row.creditCode}-${row.history}`}><td className="border-r border-border px-2 py-2">{row.date}</td><td className="border-r border-border px-2 py-2">{row.history}</td><td className="border-r border-border px-2 py-2 tabular-nums">{row.debitCode}</td><td className="border-r border-border px-2 py-2 tabular-nums">{row.debitCostCenter || "—"}</td><td className="border-r border-border px-2 py-2 tabular-nums">{row.creditCode}</td><td className="border-r border-border px-2 py-2 tabular-nums">{row.creditCostCenter || "—"}</td><td className="border-r border-border px-2 py-2 text-right tabular-nums">{money(row.amountInCents)}</td><td className="px-2 py-2 text-[11px] text-muted-foreground">{row.mappingReason}</td></tr>)}</tbody></table></div>
                {!conferenceOk && <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">A exportação só é liberada depois que a prévia estiver realmente corrigida e a Conferência for marcada como OK.</p>}
              </section>

              <div><div className="mb-3"><h4 className="font-semibold">Prévia do Balancete corrigido</h4><p className="mt-1 text-sm text-muted-foreground">VERDE forte = linha realmente alterada. VERMELHO forte = problema crítico que ainda permaneceu após os lançamentos.</p></div><TrialBalanceTable rows={plan.previewRows} observations={previewObservationMap} originalRows={result?.rows ?? []} preview onExpand={() => setExpanded("preview")} empty="Sem prévia." /></div>
            </>}
          </TabsContent>

          <TabsContent value="conferencia" className="mt-7">
            <section className="rounded-md border border-border bg-background p-6">
              <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div><h3 className="font-semibold">Conferência</h3><p className="mt-1 text-sm text-muted-foreground">Aqui nada é ajustado. Esta aba verifica se a prévia realmente reproduz o fechamento esperado antes da exportação.</p></div>
                <Button disabled={!planConferable || conferenceOk} onClick={() => void markConferenceOk()}>{conferenceOk ? <><CheckCircle2 className="mr-2 h-4 w-4" />Conferência OK</> : "Marcar conferência como OK"}</Button>
              </div>

              {!plan ? <div className="grid min-h-48 place-items-center text-sm text-muted-foreground">Gere primeiro a correção automática na aba Lançamentos.</div> : <div className="mt-5 space-y-5">
                <div className="grid gap-4 sm:grid-cols-5"><CheckCard label="Saldo Anterior" ok={plan.previousBalanceVerified} detail={plan.previousBalanceVerified ? "Confirmado em todas as linhas" : "Leitura incompleta"} /><CheckCard label="Referência" ok={!(plan.referenceIssues?.length)} detail={plan.referenceSource || "Motor de fechamento"} /><CheckCard label="Críticos restantes" ok={plan.remainingCriticalObservations.length === 0} detail={`${plan.remainingCriticalObservations.length} crítico(s)`} /><CheckCard label="Débitos x créditos" ok={Math.abs(previewSummary.movementDifferenceInCents) <= 1} detail={`Diferença ${money(previewSummary.movementDifferenceInCents)}`} /><CheckCard label="Linhas matemáticas" ok={!plan.previewRows.some(row => Math.abs(validateTrialBalanceRow(row)) > 10_000)} detail={`${plan.previewRows.filter(row => Math.abs(validateTrialBalanceRow(row)) > 10_000).length} divergência(s) material(is)`} /></div>
                <div className="rounded-md bg-muted/40 p-4 text-xs text-muted-foreground"><p className="font-medium text-foreground">Regra desta Conferência</p><p className="mt-2">• 0,00 em Saldo Anterior é válido quando foi realmente lido do documento.</p><p className="mt-1">• O Balancete da própria competência define quais C.R. existem; C.R. de outro plano/ano não é copiado.</p><p className="mt-1">• Lançamentos já presentes são consumidos pela reconciliação e não aparecem de novo nos ajustes.</p><p className="mt-1">• Centro de custo é preservado por lançamento quando a conta/evento exige — não por ser simplesmente analítica.</p></div>
                {conferenceOk && <div className="flex items-center gap-2 rounded-md border-2 border-emerald-600/40 bg-emerald-500/15 p-4 text-sm font-semibold text-emerald-800 dark:text-emerald-200"><CheckCircle2 className="h-4 w-4" />Conferência marcada como OK. A exportação dos ajustes está liberada na aba Lançamentos.</div>}
              </div>}
            </section>
          </TabsContent>
        </Tabs>
      </main>
    </div>

    <Dialog open={Boolean(pending)} onOpenChange={open => !open && setPending(null)}><DialogContent><DialogHeader><DialogTitle>Balancete de outra competência</DialogTitle><DialogDescription>Você está em {competence}, mas o documento foi identificado como {pending?.result.competence}.</DialogDescription></DialogHeader><p className="text-sm text-muted-foreground">Se mantiver, o arquivo será salvo e aberto automaticamente na competência correta. Se excluir, nada será gravado.</p><DialogFooter><Button variant="destructive" onClick={() => setPending(null)}>Excluir importação</Button><Button onClick={() => void keepDetected()}>Manter em {pending?.result.competence}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={expanded !== null} onOpenChange={open => !open && setExpanded(null)}><DialogContent className="max-h-[90vh] w-[96vw] max-w-[1650px] overflow-hidden p-0"><DialogHeader className="border-b border-border px-6 py-5 text-left"><DialogTitle>{expanded === "preview" ? "Prévia do Balancete corrigido" : "Balancete importado"}</DialogTitle></DialogHeader><div className="max-h-[78vh] overflow-auto"><TrialBalanceTable rows={expanded === "preview" ? plan?.previewRows ?? [] : result?.rows ?? []} observations={expanded === "preview" ? previewObservationMap : observationMap} originalRows={expanded === "preview" ? result?.rows ?? [] : undefined} preview={expanded === "preview"} empty="Sem dados." embedded /></div></DialogContent></Dialog>
  </div>;
}

function TrialBalanceTable({ rows, observations, originalRows, preview = false, onExpand, empty, embedded = false }: { rows: TrialBalanceRow[]; observations: Map<string, TrialBalanceObservation[]>; originalRows?: TrialBalanceRow[]; preview?: boolean; onExpand?: () => void; empty: string; embedded?: boolean }) {
  const analyticalIds = useMemo(() => new Set(analyticalTrialBalanceRows(rows).map(row => row.id)), [rows]);
  const originalMap = useMemo(() => new Map((originalRows ?? []).map(row => [row.id, row])), [originalRows]);
  const table = <table className="w-full min-w-[1050px] table-fixed text-xs"><thead className="sticky top-0 z-10 bg-muted text-left text-[11px] text-muted-foreground"><tr><th className="w-[15%] border-b border-r border-border px-2 py-2">Conta</th><th className="w-[31%] border-b border-r border-border px-2 py-2">Título</th><th className="w-[9%] border-b border-r border-border px-2 py-2">C.R.</th><th className="w-[13%] border-b border-r border-border px-2 py-2 text-right">Saldo ant.</th><th className="w-[11%] border-b border-r border-border px-2 py-2 text-right">Débito</th><th className="w-[11%] border-b border-r border-border px-2 py-2 text-right">Crédito</th><th className="w-[10%] border-b border-border px-2 py-2 text-right">Saldo atual</th></tr></thead><tbody>{rows.map(row => {
    const depth = trialBalanceDepth(row.accountCode);
    const rowObservations = observations.get(row.id) ?? [];
    const isAnalytical = analyticalIds.has(row.id);
    const original = originalMap.get(row.id);
    const changed = preview && original && (original.currentBalanceInCents !== row.currentBalanceInCents || original.currentNature !== row.currentNature || original.debitInCents !== row.debitInCents || original.creditInCents !== row.creditInCents);
    const semanticClass = rowObservations.length
      ? "border-l-4 border-l-red-700 bg-red-600/30 font-medium hover:bg-red-600/40 dark:bg-red-500/30 dark:hover:bg-red-500/40"
      : changed
        ? "border-l-4 border-l-emerald-700 bg-emerald-500/30 font-medium hover:bg-emerald-500/40 dark:bg-emerald-400/25 dark:hover:bg-emerald-400/35"
        : !isAnalytical && depth === 0
          ? "bg-cyan-950/[0.08] dark:bg-cyan-300/[0.08]"
          : !isAnalytical && depth === 1 ? "bg-cyan-500/[0.07]" : !isAnalytical ? "bg-cyan-500/[0.035]" : "";
    return <tr key={row.id} className={cn("border-b border-border transition-colors", semanticClass)}><td className="border-r border-border px-2 py-1.5 font-mono text-[11px]">{row.accountCode}</td><td className="border-r border-border px-2 py-1.5"><div className="flex min-w-0 items-center gap-2" style={{ paddingLeft: `${depth * 14}px` }}>{rowObservations.length > 0 && <ObservationHover observations={rowObservations} />}<span className={cn("truncate", !isAnalytical && "font-semibold", depth === 0 && "uppercase tracking-wide")}>{row.title}</span>{changed && !rowObservations.length && <span className="shrink-0 rounded-md border border-emerald-800/30 bg-emerald-700 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-sm">AJUSTADO</span>}</div></td><td className="border-r border-border px-2 py-1.5 tabular-nums">{row.reducedCode || "—"}</td><td className="border-r border-border px-2 py-1.5 text-right tabular-nums">{formatAmountNature(row.previousBalanceInCents, row.previousNature)}</td><td className="border-r border-border px-2 py-1.5 text-right tabular-nums">{money(row.debitInCents)}</td><td className="border-r border-border px-2 py-1.5 text-right tabular-nums">{money(row.creditInCents)}</td><td className="px-2 py-1.5 text-right font-semibold tabular-nums">{formatAmountNature(row.currentBalanceInCents, row.currentNature)}</td></tr>;
  })}{!rows.length && <tr><td colSpan={7} className="h-44 text-center text-muted-foreground">{empty}</td></tr>}</tbody></table>;
  if (embedded) return table;
  return <div className="overflow-hidden rounded-md border border-border bg-background"><div className="flex h-8 items-center justify-end border-b border-border px-2">{onExpand && <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onExpand} title="Expandir tabela"><Maximize2 className="h-3.5 w-3.5" /></Button>}</div><div className="overflow-x-auto">{table}</div></div>;
}

function ObservationHover({ observations }: { observations: TrialBalanceObservation[] }) {
  return <HoverCard openDelay={80} closeDelay={80}><HoverCardTrigger asChild><button type="button" className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-red-700 text-white shadow-sm ring-2 ring-red-500/30" aria-label="Ver problema crítico"><CircleAlert className="h-4 w-4" /></button></HoverCardTrigger><HoverCardContent side="right" align="start" className="w-[380px] overflow-hidden border-2 border-red-600/30 p-0 shadow-xl"><div className="bg-red-600/15 px-4 py-3"><p className="text-xs font-extrabold uppercase tracking-wide text-red-800 dark:text-red-200">Problema crítico</p></div><div className="space-y-3 p-4">{observations.map(item => <div key={item.id}><p className="text-sm font-bold text-foreground">{item.headline}</p><p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.message}</p>{item.suggestedSignedInCents !== undefined && <p className="mt-2 text-xs"><span className="text-muted-foreground">Resultado esperado: </span><span className="font-semibold text-foreground">{balance(item.suggestedSignedInCents)}</span></p>}<p className="mt-1 text-[10px] text-muted-foreground">Base: {item.source}</p></div>)}</div></HoverCardContent></HoverCard>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-md border border-border bg-background px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold tabular-nums">{value}</p></div>; }
function CheckCard({ label, ok, detail }: { label: string; ok: boolean; detail: string }) { return <div className={cn("rounded-md border-2 p-4", ok ? "border-emerald-600/35 bg-emerald-500/12" : "border-red-600/40 bg-red-600/12")}><div className="flex items-center gap-2">{ok ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : <AlertTriangle className="h-4 w-4 text-red-700" />}<p className="text-sm font-semibold">{label}</p></div><p className="mt-2 text-xs text-muted-foreground">{detail}</p></div>; }
function formatAmountNature(amount: number, nature: string) { return !amount || !nature ? "0,00" : `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount / 100)} ${nature}`; }
function groupObservations(items: TrialBalanceObservation[]) { const map = new Map<string, TrialBalanceObservation[]>(); for (const item of items) map.set(item.rowId, [...(map.get(item.rowId) ?? []), item]); return map; }
function readContext(company: string): SavedContext | null { try { const raw = localStorage.getItem(contextKey(company)); return raw ? JSON.parse(raw) as SavedContext : null; } catch { return null; } }
