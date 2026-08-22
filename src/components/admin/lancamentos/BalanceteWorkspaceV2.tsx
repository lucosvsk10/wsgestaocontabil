import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleAlert, FileSpreadsheet, Loader2, Maximize2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAccountingCompany } from "@/hooks/lancamentos/useAccountingCompany";
import { exportAccountingWorkbook } from "@/lib/lancamentos/accountingExportWorkbook";
import {
  buildDynamicTrialBalancePlan,
  TrialBalanceAutoPlan,
  TrialBalanceObservation,
  trialBalancePlanIsConferable,
} from "@/lib/lancamentos/trialBalanceAutoAdjustment";
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

export function BalanceteWorkspaceV2() {
  const today = new Date();
  const { company, companies, selectCompany } = useAccountingCompany();
  const initial = readContext(company.id);
  const [year, setYear] = useState(initial?.year ?? String(today.getFullYear()));
  const [month, setMonth] = useState(initial?.month ?? String(today.getMonth() + 1).padStart(2, "0"));
  const [activeTab, setActiveTab] = useState(initial?.tab ?? "balancete");
  const [result, setResult] = useState<TrialBalanceResult | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [analysis, setAnalysis] = useState<TrialBalanceAutoPlan | null>(null);
  const [plan, setPlan] = useState<TrialBalanceAutoPlan | null>(null);
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
        loadWorkspaceData<TrialBalanceAutoPlan>(`${prefix}:auto-plan`),
        loadWorkspaceData<boolean>(`${prefix}:conference-ok`),
      ]);
      const issues = (saved?.warnings.length ?? 0) + (saved?.validationIssues.length ?? 0) + (saved?.rows.filter(row => Math.abs(validateTrialBalanceRow(row)) > 1).length ?? 0);
      return [key, { hasData: Boolean(saved?.rows?.length), issues, corrected: Boolean(savedPlan?.adjustments?.length), conferenceOk: Boolean(ok) }] as const;
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
      loadWorkspaceData<TrialBalanceAutoPlan>(planKey),
      loadWorkspaceData<boolean>(conferenceKey),
    ]).then(async ([saved, docs, savedPlan, savedOk]) => {
      if (!active) return;
      setResult(saved ?? null);
      setFiles(docs);
      setPlan(savedPlan ?? null);
      setConferenceOk(Boolean(savedOk));
      if (saved?.rows?.length) {
        try {
          const nextAnalysis = await buildDynamicTrialBalancePlan(company.id, month, year, saved.rows);
          if (active) setAnalysis(nextAnalysis);
        } catch (reason) {
          if (active) setError(reason instanceof Error ? reason.message : "Falha ao analisar o balancete.");
        }
      }
    });
    return () => { active = false; };
  }, [company.id, conferenceKey, dataKey, month, planKey, scope, year]);

  const observations = analysis?.observations ?? [];
  const observationMap = useMemo(() => groupObservations(observations), [observations]);
  const previewObservationMap = useMemo(() => groupObservations(plan?.observations ?? []), [plan]);
  const previewSummary = useMemo(() => summarizeTrialBalance(plan?.previewRows ?? []), [plan]);
  const planConferable = trialBalancePlanIsConferable(plan);
  const criticalOriginal = observations.filter(item => item.severity === "critical").length;
  const warningsOriginal = observations.filter(item => item.severity === "warning").length;

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selected.length) return;
    setProcessing(true); setError(null);
    try {
      const documents = await Promise.all(selected.map(async file => ({ name: file.name, mime_type: file.type || "application/pdf", data: await asBase64(file) })));
      const { data, error: invokeError } = await supabase.functions.invoke("process-trial-balance-document", { body: { company_id: company.id, documents } });
      if (invokeError) throw await functionError(invokeError, "Falha ao ler o Balancete do Calima.");
      if (!Array.isArray(data?.rows) || !data.competence) throw new Error("O balancete não devolveu linhas estruturadas.");
      const parsed = data as TrialBalanceResult;
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
    const nextAnalysis = await buildDynamicTrialBalancePlan(company.id, targetMonth, targetYear, parsed.rows);
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
    setCorrecting(true); setError(null); setConferenceOk(false);
    try {
      const nextPlan = await buildDynamicTrialBalancePlan(company.id, month, year, result.rows);
      setPlan(nextPlan);
      await saveWorkspaceData(planKey, nextPlan);
      await saveWorkspaceData(conferenceKey, false);
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
      note: "Ajustes calculados a partir do balancete importado, dos lançamentos da competência e do histórico da empresa. A Conferência não altera saldos; apenas valida a prévia antes da exportação.",
    });
  };

  return <div className="mx-auto w-full max-w-[1720px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
    <header className="flex flex-col gap-4 border-b border-border pb-5 xl:flex-row xl:items-end xl:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Fechamento contábil</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Balancete</h1>
        <p className="mt-1 text-sm text-muted-foreground">Importe o balancete bruto do Calima, identifique incoerências e gere somente os lançamentos necessários para corrigi-lo.</p>
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
            const dot = state?.conferenceOk ? "bg-emerald-500" : state?.corrected ? "bg-cyan-500" : state?.hasData ? "bg-amber-400" : "bg-muted-foreground/25";
            return <button key={key} type="button" onClick={() => setMonth(key)} className={cn("flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm transition-colors", active ? "bg-cyan-500/15 text-cyan-800 dark:text-cyan-200" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}>
              <span>{label}</span><span className="flex items-center gap-2"><span className="text-[10px]">{state?.conferenceOk ? "OK" : state?.corrected ? "prévia" : state?.hasData ? `${state.issues} pend.` : ""}</span><span className={cn("h-2 w-2 rounded-full", dot)} /></span>
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
              <Button type="button" variant="outline" disabled={processing} onClick={() => inputRef.current?.click()}>{processing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Lendo...</> : <><FileSpreadsheet className="mr-2 h-4 w-4" />Importar Balancete</>}</Button>
              <input ref={inputRef} type="file" accept=".pdf" className="sr-only" onChange={event => void importFile(event)} />
            </div>
          </div>
          {files.length > 0 && <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">{files.map(file => <span key={`${file.name}-${file.size}`} className="mr-4 text-foreground">{file.name}</span>)}</div>}
          {error && <div className="mt-4 flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
          <AccountingWorkflowSteps steps={[
            { value: "balancete", label: "Balancete", count: result?.rows.length ?? 0 },
            { value: "lancamentos", label: "Lançamentos", count: plan?.adjustments.length ?? observations.length },
            { value: "conferencia", label: "Conferência", count: conferenceOk ? 0 : plan ? (planConferable ? 1 : 2) : 1 },
          ]} />

          <TabsContent value="balancete" className="mt-7 space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><h3 className="font-semibold">Balancete importado</h3><p className="mt-1 text-sm text-muted-foreground">Linhas com possível incoerência ficam destacadas. Passe o mouse no ícone de observação para entender o motivo.</p></div>
              {result?.rows.length ? <div className="flex gap-2 text-xs"><span className="rounded-md border border-red-500/20 bg-red-500/5 px-2.5 py-1.5 text-red-700 dark:text-red-300">{criticalOriginal} críticas</span><span className="rounded-md border border-amber-500/20 bg-amber-500/5 px-2.5 py-1.5 text-amber-700 dark:text-amber-300">{warningsOriginal} observações</span></div> : null}
            </div>
            <TrialBalanceTable rows={result?.rows ?? []} observations={observationMap} onExpand={() => setExpanded("original")} empty="Importe um Balancete Acumulado Analítico do Calima para começar." />
          </TabsContent>

          <TabsContent value="lancamentos" className="mt-7 space-y-6">
            <div className="rounded-md border border-border bg-background p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div><h3 className="font-semibold">Correção do Balancete</h3><p className="mt-1 max-w-3xl text-sm text-muted-foreground">A correção não usa um valor fechado de outro ano. Ela cruza este balancete com faturamento, compras, folha, despesas, mês anterior e, quando disponível, o mesmo mês do exercício anterior.</p></div>
                <Button disabled={!result?.rows.length || correcting} onClick={() => void correctAutomatically()}>{correcting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processando correção...</> : <><Sparkles className="mr-2 h-4 w-4" />Corrigir automaticamente</>}</Button>
              </div>
              {analysis?.contextSummary?.length ? <div className="mt-4 grid gap-2 border-t border-border pt-4 text-xs text-muted-foreground md:grid-cols-2">{analysis.contextSummary.slice(0, 4).map(text => <p key={text}>{text}</p>)}</div> : null}
            </div>

            {!plan ? <div className="grid min-h-52 place-items-center rounded-md border border-dashed border-border bg-muted/20 p-8 text-center"><div><Sparkles className="mx-auto h-6 w-6 text-muted-foreground" /><p className="mt-3 text-sm font-medium">Nenhuma prévia gerada ainda</p><p className="mt-1 text-xs text-muted-foreground">Clique em Corrigir automaticamente para transformar as incoerências em lançamentos de ajuste.</p></div></div> : <>
              <div className="grid gap-3 sm:grid-cols-3"><Metric label="Ajustes gerados" value={String(plan.adjustments.length)} /><Metric label="Caixa atual" value={plan.currentCashSignedInCents === null ? "Não localizado" : balance(plan.currentCashSignedInCents)} /><Metric label="Caixa projetado" value={plan.projectedCashSignedInCents === null ? "Não localizado" : balance(plan.projectedCashSignedInCents)} /></div>

              <section className="overflow-hidden rounded-md border border-border bg-background">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3"><div><h4 className="text-sm font-semibold">Lançamentos de ajuste</h4><p className="mt-0.5 text-xs text-muted-foreground">Estes são os lançamentos que serão levados ao Calima; o balancete original não é reescrito.</p></div><Button disabled={!conferenceOk || !planConferable || !plan.adjustments.length} onClick={exportAdjustments}>Exportar ajustes para o Calima</Button></div>
                <div className="overflow-x-auto"><table className="w-full min-w-[980px] table-fixed text-xs"><thead className="bg-muted/50 text-left text-[11px] text-muted-foreground"><tr><th className="w-[11%] border-b border-r border-border px-2 py-2">Data</th><th className="w-[31%] border-b border-r border-border px-2 py-2">Histórico</th><th className="w-[10%] border-b border-r border-border px-2 py-2">Débito</th><th className="w-[10%] border-b border-r border-border px-2 py-2">Crédito</th><th className="w-[15%] border-b border-r border-border px-2 py-2 text-right">Valor</th><th className="w-[23%] border-b border-border px-2 py-2">Motivo</th></tr></thead><tbody>{plan.adjustments.map(row => <tr key={`${row.targetKey}-${row.debitCode}-${row.creditCode}`}><td className="border-r border-border px-2 py-2">{row.date}</td><td className="border-r border-border px-2 py-2">{row.history}</td><td className="border-r border-border px-2 py-2 tabular-nums">{row.debitCode}</td><td className="border-r border-border px-2 py-2 tabular-nums">{row.creditCode}</td><td className="border-r border-border px-2 py-2 text-right tabular-nums">{money(row.amountInCents)}</td><td className="px-2 py-2 text-[11px] text-muted-foreground">{row.mappingReason}</td></tr>)}</tbody></table></div>
                {!conferenceOk && <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">Confira a prévia na aba Conferência e marque como OK para liberar a exportação.</p>}
              </section>

              <div><div className="mb-3 flex items-end justify-between gap-3"><div><h4 className="font-semibold">Prévia do Balancete corrigido</h4><p className="mt-1 text-sm text-muted-foreground">Simulação de como os saldos devem ficar depois que os lançamentos acima forem importados no Calima.</p></div></div><TrialBalanceTable rows={plan.previewRows} observations={previewObservationMap} originalRows={result?.rows ?? []} preview onExpand={() => setExpanded("preview")} empty="Sem prévia." /></div>
            </>}
          </TabsContent>

          <TabsContent value="conferencia" className="mt-7">
            <section className="rounded-md border border-border bg-background p-6">
              <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div><h3 className="font-semibold">Conferência</h3><p className="mt-1 text-sm text-muted-foreground">Aqui nada é ajustado. Esta aba apenas verifica se a prévia e os lançamentos fecham antes da exportação.</p></div>
                <Button disabled={!planConferable || conferenceOk} onClick={() => void markConferenceOk()}>{conferenceOk ? <><CheckCircle2 className="mr-2 h-4 w-4" />Conferência OK</> : "Marcar conferência como OK"}</Button>
              </div>

              {!plan ? <div className="grid min-h-48 place-items-center text-sm text-muted-foreground">Gere primeiro a correção automática na aba Lançamentos.</div> : <div className="mt-5 space-y-5">
                <div className="grid gap-4 sm:grid-cols-4"><CheckCard label="Débitos x créditos" ok={Math.abs(previewSummary.movementDifferenceInCents) <= 1} detail={`Diferença ${money(previewSummary.movementDifferenceInCents)}`} /><CheckCard label="Saldos atuais" ok={Math.abs(previewSummary.currentSignedInCents) <= 1} detail={`Diferença ${money(previewSummary.currentSignedInCents)}`} /><CheckCard label="Linhas matemáticas" ok={!plan.previewRows.some(row => Math.abs(validateTrialBalanceRow(row)) > 1)} detail={`${plan.previewRows.filter(row => Math.abs(validateTrialBalanceRow(row)) > 1).length} divergência(s)`} /><CheckCard label="Caixa projetado" ok={plan.targetCashSignedInCents === null || plan.projectedCashSignedInCents === null || Math.abs(plan.projectedCashSignedInCents - plan.targetCashSignedInCents) <= 1} detail={plan.projectedCashSignedInCents === null ? "Não localizado" : balance(plan.projectedCashSignedInCents)} /></div>
                <div className="rounded-md bg-muted/40 p-4 text-xs text-muted-foreground"><p className="font-medium text-foreground">O que foi validado</p><p className="mt-2">• Os lançamentos de ajuste são partidas dobradas e o total de débitos continua igual ao de créditos.</p><p className="mt-1">• A prévia recalcula grupos e subgrupos a partir das contas analíticas para não esconder diferença em conta sintética.</p><p className="mt-1">• Valores de exercícios anteriores são usados apenas como histórico de comportamento; nenhum saldo fechado é copiado para outra competência.</p></div>
                {conferenceOk && <div className="flex items-center gap-2 rounded-md border border-emerald-500/25 bg-emerald-500/5 p-4 text-sm text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" />Conferência marcada como OK. A exportação dos ajustes está liberada na aba Lançamentos.</div>}
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
    const semanticClass = rowObservations.length ? "bg-red-500/[0.075] hover:bg-red-500/[0.12]" : changed ? "bg-emerald-500/[0.06] hover:bg-emerald-500/[0.10]" : !isAnalytical && depth === 0 ? "bg-cyan-950/[0.08] dark:bg-cyan-300/[0.08]" : !isAnalytical && depth === 1 ? "bg-cyan-500/[0.07]" : !isAnalytical ? "bg-cyan-500/[0.035]" : "";
    return <tr key={row.id} className={cn("border-b border-border", semanticClass)}><td className="border-r border-border px-2 py-1.5 font-mono text-[11px]">{row.accountCode}</td><td className="border-r border-border px-2 py-1.5"><div className="flex min-w-0 items-center gap-2" style={{ paddingLeft: `${depth * 14}px` }}>{rowObservations.length > 0 && <ObservationHover observations={rowObservations} />}<span className={cn("truncate", !isAnalytical && "font-semibold", depth === 0 && "uppercase tracking-wide")}>{row.title}</span>{changed && <span className="shrink-0 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 dark:text-emerald-300">ajustado</span>}</div></td><td className="border-r border-border px-2 py-1.5 tabular-nums">{row.reducedCode || "—"}</td><td className="border-r border-border px-2 py-1.5 text-right tabular-nums">{formatAmountNature(row.previousBalanceInCents, row.previousNature)}</td><td className="border-r border-border px-2 py-1.5 text-right tabular-nums">{money(row.debitInCents)}</td><td className="border-r border-border px-2 py-1.5 text-right tabular-nums">{money(row.creditInCents)}</td><td className="px-2 py-1.5 text-right font-medium tabular-nums">{formatAmountNature(row.currentBalanceInCents, row.currentNature)}</td></tr>;
  })}{!rows.length && <tr><td colSpan={7} className="h-44 text-center text-muted-foreground">{empty}</td></tr>}</tbody></table>;
  if (embedded) return table;
  return <div className="overflow-hidden rounded-md border border-border bg-background"><div className="flex h-8 items-center justify-end border-b border-border px-2">{onExpand && <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onExpand} title="Expandir tabela"><Maximize2 className="h-3.5 w-3.5" /></Button>}</div><div className="overflow-x-auto">{table}</div></div>;
}

function ObservationHover({ observations }: { observations: TrialBalanceObservation[] }) {
  const critical = observations.some(item => item.severity === "critical");
  return <HoverCard openDelay={100} closeDelay={80}><HoverCardTrigger asChild><button type="button" className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full", critical ? "bg-red-500/15 text-red-600 dark:text-red-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300")} aria-label="Ver observação"><CircleAlert className="h-3.5 w-3.5" /></button></HoverCardTrigger><HoverCardContent side="right" align="start" className="w-[360px] p-0"><div className="border-b border-border px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Observação do fechamento</p></div><div className="space-y-3 p-4">{observations.map(item => <div key={item.id}><div className="flex items-center gap-2"><span className={cn("h-2 w-2 rounded-full", item.severity === "critical" ? "bg-red-500" : "bg-amber-400")} /><p className="text-sm font-medium">{item.headline}</p></div><p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.message}</p>{item.suggestedSignedInCents !== undefined && <p className="mt-2 text-xs"><span className="text-muted-foreground">Sugestão calculada: </span><span className="font-medium text-foreground">{balance(item.suggestedSignedInCents)}</span></p>}<p className="mt-1 text-[10px] text-muted-foreground">Base: {item.source}</p></div>)}</div></HoverCardContent></HoverCard>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-md border border-border bg-background px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold tabular-nums">{value}</p></div>; }
function CheckCard({ label, ok, detail }: { label: string; ok: boolean; detail: string }) { return <div className={cn("rounded-md border p-4", ok ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5")}><div className="flex items-center gap-2">{ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-red-600" />}<p className="text-sm font-medium">{label}</p></div><p className="mt-2 text-xs text-muted-foreground">{detail}</p></div>; }
function formatAmountNature(amount: number, nature: string) { return !amount || !nature ? "0,00" : `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount / 100)} ${nature}`; }
function groupObservations(items: TrialBalanceObservation[]) { const map = new Map<string, TrialBalanceObservation[]>(); for (const item of items) map.set(item.rowId, [...(map.get(item.rowId) ?? []), item]); return map; }
function readContext(company: string): SavedContext | null { try { const raw = localStorage.getItem(contextKey(company)); return raw ? JSON.parse(raw) as SavedContext : null; } catch { return null; } }
function asBase64(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] || ""); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); }); }
async function functionError(reason: unknown, fallback: string) { let message = reason instanceof Error ? reason.message : fallback; try { const response = (reason as { context?: Response }).context; if (response) { const payload = await response.clone().json(); message = payload?.error || message; } } catch { /* mantém mensagem original */ } return new Error(message); }
