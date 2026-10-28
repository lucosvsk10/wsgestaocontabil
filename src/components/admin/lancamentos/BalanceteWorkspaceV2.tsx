import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleAlert, FileSpreadsheet, Info, Loader2, Maximize2, Sparkles, Trash2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAccountingCompany } from "@/hooks/lancamentos/useAccountingCompany";
import { exportCalimaBalancete } from "@/lib/lancamentos/calimaBalanceteExport";
import {
  applyAiClosingReview,
  AiClosingResponse,
  AiClosingSource,
  buildCriticalTrialBalancePlan,
  CriticalTrialBalancePlan,
  criticalTrialBalancePlanIsCorrected,
} from "@/lib/lancamentos/trialBalanceCriticalCorrection";
import { TrialBalanceObservation } from "@/lib/lancamentos/trialBalanceAutoAdjustment";
import { parseCalimaTrialBalance } from "@/lib/lancamentos/trialBalancePdfParser";
import { balanceLimitForRow, checkBalanceLimits, BalanceLimitOverrides, BalanceLimitRule } from "@/lib/lancamentos/trialBalanceLimits";
import {
  analyticalTrialBalanceRows,
  signedBalance,
  summarizeTrialBalance,
  trialBalanceDepth,
  TrialBalanceResult,
  TrialBalanceRow,
  validateTrialBalanceRow,
} from "@/lib/lancamentos/trialBalance";
import { clearWorkspaceFiles, deleteWorkspaceData, deleteLocalWorkspaceData, loadWorkspaceData, loadLocalWorkspaceData, loadLocalWorkspaceFiles, saveWorkspaceData, saveWorkspaceFiles, saveLocalWorkspaceData, saveLocalWorkspaceFiles } from "@/lib/lancamentos/workspaceStorage";
import { cn } from "@/lib/utils";
import { AccountingWorkflowSteps } from "./AccountingWorkflowUI";
import { AccountingYearPicker } from "./AccountingYearPicker";

const months = [
  ["01", "Janeiro"], ["02", "Fevereiro"], ["03", "Março"], ["04", "Abril"], ["05", "Maio"], ["06", "Junho"],
  ["07", "Julho"], ["08", "Agosto"], ["09", "Setembro"], ["10", "Outubro"], ["11", "Novembro"], ["12", "Dezembro"],
] as const;

interface PendingImport { result: TrialBalanceResult; files: File[]; }
interface MonthState { hasData: boolean; hasFile: boolean; issues: number; corrected: boolean; conferenceOk: boolean; }
interface SavedContext { year: string; month: string; tab: string; }
type TrialBalanceResultWithPrevious = TrialBalanceResult & { previousBalanceVerified?: boolean; previousBalanceReadCount?: number; };
type TrialBalanceRowWithPrevious = TrialBalanceRow & { previousBalanceRead?: boolean; };

const contextKey = (company: string) => `ws:balancete:last-context:${company}`;
const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Math.abs(cents) / 100);
const balance = (signed: number) => Math.abs(signed) <= 1 ? "R$ 0,00" : `${money(signed)} ${signed > 0 ? "D" : "C"}`;
const previousBalancesAreVerified = (result: TrialBalanceResult | null) => Boolean(result?.rows.length && result.rows.every(row => (row as TrialBalanceRowWithPrevious).previousBalanceRead === true));

export function BalanceteWorkspaceV2() {
  const today = new Date();
  const { company } = useAccountingCompany();
  const initial = readContext(company.id);
  const [year, setYear] = useState(initial?.year ?? String(today.getFullYear()));
  const [month, setMonth] = useState(initial?.month ?? String(today.getMonth() + 1).padStart(2, "0"));
  const [activeTab, setActiveTab] = useState(initial?.tab ?? "balancete");
  const [result, setResult] = useState<TrialBalanceResult | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [analysis, setAnalysis] = useState<CriticalTrialBalancePlan | null>(null);
  const [limits, setLimits] = useState<BalanceLimitOverrides>({});
  const [onlyCritical, setOnlyCritical] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<BalanceLimitRule | null>(null);
  const [plan, setPlan] = useState<CriticalTrialBalancePlan | null>(null);
  const [conferenceOk, setConferenceOk] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [cloudSync, setCloudSync] = useState<{ scope: string; status: "local" | "syncing" | "synced" | "failed" } | null>(null);
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
  const limitKey = `${company.id}:balancete:limits`;
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
        loadLocalWorkspaceData<TrialBalanceResult>(`${prefix}:parsed`),
        loadLocalWorkspaceData<CriticalTrialBalancePlan>(`${prefix}:auto-plan`),
        loadLocalWorkspaceData<boolean>(`${prefix}:conference-ok`),
      ]);
      const storedLimits = await loadLocalWorkspaceData<BalanceLimitOverrides>(`${company.id}:balancete:limits`);
      const corrected = criticalTrialBalancePlanIsCorrected(savedPlan)
        && checkBalanceLimits(savedPlan?.previewRows ?? [], storedLimits || {}).every(item => !item.critical);
      const issues = corrected ? 0 : saved?.rows?.length ? checkBalanceLimits(saved.rows, storedLimits || {}).filter(item => item.critical).length : 0;
      return [key, { hasData: Boolean(saved?.rows?.length), hasFile: Boolean(saved?.rows?.length), issues, corrected, conferenceOk: Boolean(ok && corrected) }] as const;
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
    (async () => {
      try {
        const [saved, docs, savedPlan, storedLimits, syncMarker] = await Promise.all([
          loadLocalWorkspaceData<TrialBalanceResult>(dataKey),
          loadLocalWorkspaceFiles(scope),
          loadLocalWorkspaceData<CriticalTrialBalancePlan>(planKey),
          loadLocalWorkspaceData<BalanceLimitOverrides>(limitKey),
          loadLocalWorkspaceData<{ status: "pending" | "synced" }>(`${scope}:sync-state`),
        ]);
        if (!active) return;
        setResult(saved ?? null);
        setFiles(docs);
        setLimits(storedLimits || {});
        setPlan(savedPlan?.aiReview ? savedPlan : null);
        setConferenceOk(false);
        setCloudSync(syncMarker ? { scope, status: syncMarker.status === "synced" ? "synced" : "local" } : null);
        // Only load from cloud if there is no local copy. Never download the PDF
        // just to display the Balancete; the parsed rows are sufficient.
        if (!saved) {
          const remote = await loadWorkspaceData<TrialBalanceResult>(dataKey);
          if (remote && active) {
            setResult(remote);
            setCloudSync({ scope, status: "synced" });
            void saveLocalWorkspaceData(dataKey, remote);
          }
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Falha ao recuperar a cópia local.");
      }
    })();
    return () => { active = false; };
  }, [company.id, conferenceKey, dataKey, month, planKey, scope, year, limitKey]);

  const checks = useMemo(() => checkBalanceLimits(result?.rows || [], limits), [result, limits]);
  const flagged = useMemo(() => checks.filter(item => item.critical), [checks]);
  const reviewLimits = useMemo<BalanceLimitOverrides>(() => {
    const tightened: BalanceLimitOverrides = {};
    (result?.rows || []).forEach(row => {
      const rule = balanceLimitForRow(row, limits[row.reducedCode] || {});
      tightened[row.reducedCode] = { ...rule, marginPercent: Math.min(rule.marginPercent, 20) };
    });
    return tightened;
  }, [result, limits]);
  const projectedFlags = useMemo(() => plan ? checkBalanceLimits(plan.previewRows, reviewLimits).filter(item => item.critical) : [], [plan, reviewLimits]);
  const chooseRule = (row: TrialBalanceRow) => {
    setEditingCode(row.reducedCode);
    setEditingRule(balanceLimitForRow(row, limits[row.reducedCode] || {}));
  };
  const storeRule = async () => {
    if (!editingCode || !editingRule) return;
    const next = { ...limits, [editingCode]: { ...editingRule, origin: "custom" as const } };
    setLimits(next);
    setEditingCode(null);
    setEditingRule(null);
    await saveWorkspaceData(limitKey, next);
    await refreshYearStates();
  };
  const previousBalanceVerified = previousBalancesAreVerified(result);
  const observations = (analysis?.observations ?? []).filter(item => item.severity === "critical");
  const observationMap = useMemo(() => groupObservations(observations), [observations]);
  const previewObservationMap = useMemo(() => groupObservations(plan?.remainingCriticalObservations ?? []), [plan]);

  const planConferable = criticalTrialBalancePlanIsCorrected(plan) && projectedFlags.length === 0;
  const criticalOriginal = flagged.length;

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selected.length) return;
    setProcessing(true); setProcessingStep("Lendo PDF no navegador..."); setError(null);
    try {
      if (selected.length !== 1) throw new Error("Envie um balancete PDF por vez.");
      const parsed = await parseCalimaTrialBalance(selected[0]);
      setProcessingStep("Salvando cópia local...");
      const digits = (value: string | undefined) => String(value || "").replace(/[^0-9]/g, "");
      if (company.cnpj && (!parsed.documentCnpj || digits(company.cnpj) !== digits(parsed.documentCnpj))) {
        throw new Error("O CNPJ do Balancete não foi confirmado como sendo da empresa selecionada. Importação cancelada para evitar misturar dados.");
      }
      if (parsed.competence !== competence) setPending({ result: parsed, files: selected });
      else await persistImport(parsed, selected);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao importar o balancete.");
    } finally { setProcessing(false); setProcessingStep(""); }
  };

  const syncImport = async (targetScope: string, parsed: TrialBalanceResult, selected: File[]) => {
    setCloudSync({ scope: targetScope, status: "syncing" });
    try {
      const [filesSaved, dataSaved, oldPlanDeleted, oldConferenceDeleted] = await Promise.all([
        saveWorkspaceFiles(targetScope, selected, { skipCompetencePrompt: true }),
        saveWorkspaceData(`${targetScope}:parsed`, parsed),
        deleteWorkspaceData(`${targetScope}:auto-plan`),
        deleteWorkspaceData(`${targetScope}:conference-ok`),
      ]);
      if (![filesSaved, dataSaved, oldPlanDeleted, oldConferenceDeleted].every(item => item?.synced)) {
        throw new Error("A sincronização do balancete não foi concluída no Supabase.");
      }
      await saveLocalWorkspaceData(`${targetScope}:sync-state`, { status: "synced" });
      setCloudSync({ scope: targetScope, status: "synced" });
    } catch (reason) {
      // Local copy remains safe and retryable even during a Supabase outage.
      setCloudSync({ scope: targetScope, status: "failed" });
      console.error("Balancete salvo localmente. Sincronização remota pendente.", reason);
    }
  };

  const persistImport = async (parsed: TrialBalanceResult, selected: File[]) => {
    const [targetMonth, targetYear] = parsed.competence.split("/");
    const targetScope = `${company.id}:${targetYear}:${targetMonth}:balancete`;
    // Commit both parsed rows and original PDF to IndexedDB first (no network).
    await Promise.all([
      saveLocalWorkspaceFiles(targetScope, selected),
      saveLocalWorkspaceData(`${targetScope}:parsed`, parsed),
      deleteLocalWorkspaceData(`${targetScope}:auto-plan`),
      deleteLocalWorkspaceData(`${targetScope}:conference-ok`),
      saveLocalWorkspaceData(`${targetScope}:sync-state`, { status: "pending" }),
    ]);
    setResult(parsed);
    setFiles(selected);
    setPlan(null);
    setConferenceOk(false);
    setAnalysis(null);
    setCloudSync({ scope: targetScope, status: "local" });
    setActiveTab("balancete");
    if (targetMonth !== month || targetYear !== year) {
      setYear(targetYear);
      setMonth(targetMonth);
    }
    // Never block the import spinner on a remote upload, remote deletes,
    // a second download of the PDF, or all 12 month status requests.
    void refreshYearStates();
    void syncImport(targetScope, parsed, selected);
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
      const preliminary = await buildCriticalTrialBalancePlan(company.id, month, year, result.rows);
      setAnalysis(preliminary);
      const modules = ["despesas", "folha", "compras", "faturamento"] as const;
      const sources: AiClosingSource[] = await Promise.all(modules.map(async module => {
        const content = await loadWorkspaceData<{ entries?: AiClosingSource["entries"] }>(`${company.id}:${year}:${month}:${module}:parsed`);
        return { module, entries: Array.isArray(content?.entries) ? content.entries : null };
      }));
      const { data, error: aiError } = await supabase.functions.invoke("analyze-trial-balance-closing", {
        body: {
          company_id: company.id,
          competence,
          rows: analyticalTrialBalanceRows(result.rows),
          candidates: preliminary.adjustments,
          unmapped: preliminary.unmappedEntries,
          sources,
          cashPolicy: { cashTargetSignedInCents: preliminary.targetCashSignedInCents },
          limits: checkBalanceLimits(result.rows, reviewLimits).filter(item => item.critical).map(item => ({
            accountCode: item.row.accountCode, reducedCode: item.row.reducedCode,
            title: item.row.title, balanceInCents: item.signedInCents,
            minInCents: item.rule.minInCents, maxInCents: item.rule.maxInCents,
            expectedNature: item.rule.nature, reasons: item.reasons,
          })),
        },
      });
      if (aiError) throw await functionError(aiError, "Falha na análise documental por IA.");
      if (!data || !Array.isArray(data.decisions) || !Array.isArray(data.proposals)) throw new Error("A IA não devolveu uma análise válida.");
      const nextPlan = applyAiClosingReview(preliminary, result.rows, data as AiClosingResponse, sources);
      setPlan(nextPlan);
      await saveWorkspaceData(planKey, nextPlan);
      await saveWorkspaceData(conferenceKey, false);
      await refreshYearStates();
      if (!nextPlan.correctionComplete || checkBalanceLimits(nextPlan.previewRows, limits).some(item => item.critical)) {
        setError("A prévia ainda não atingiu todos os limites. Os ajustes propostos permanecem disponíveis para visualização, mas não podem ser exportados.");
      }
    } catch (reason) {
      setPlan(null);
      setError(reason instanceof Error ? reason.message : "Falha na análise de fechamento por IA.");
    } finally { setCorrecting(false); }
  };

  const exportAdjustments = () => {
    if (!plan || !planConferable || !plan.adjustments.length) return;
    exportCalimaBalancete(competence, plan.adjustments);
  };

  return <div className="mx-auto w-full max-w-[1720px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
    <header className="flex flex-col gap-4 border-b border-border pb-5 xl:flex-row xl:items-end xl:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Fechamento contábil</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Balancete</h1>
        <p className="mt-1 text-sm text-muted-foreground">Importe o balancete bruto do Calima, identifique apenas inconsistências materiais e gere os lançamentos necessários para corrigi-las.</p>
      </div>
      
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
            const dot = state?.corrected ? "bg-emerald-500" : state?.hasData && state.issues > 0 ? "bg-red-500" : state?.hasData ? "bg-sky-500" : state?.hasFile ? "bg-amber-500" : "bg-muted-foreground/25";
            return <button key={key} type="button" onClick={() => setMonth(key)} className={cn("flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm transition-colors", active ? "bg-cyan-500/15 text-cyan-800 dark:text-cyan-200" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}>
              <span>{label}</span><span className="flex items-center gap-2"><span className="text-[10px]">{state?.conferenceOk ? "OK" : state?.corrected ? "corrigido" : state?.hasData && state.issues ? `${state.issues} crítico(s)` : state?.hasData ? "importado" : state?.hasFile ? "arquivo" : ""}</span><span className={cn("h-2 w-2 rounded-full", dot)} /></span>
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
              <Button type="button" variant="outline" disabled={processing} onClick={() => inputRef.current?.click()}>{processing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Lendo Saldo Anterior...</> : <><FileSpreadsheet className="mr-2 h-4 w-4" />Importar Balancete</>}</Button>
              <input ref={inputRef} type="file" accept=".pdf" className="sr-only" onChange={event => void importFile(event)} />
            </div>
          </div>
          {files.length > 0 && <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">{files.map(file => <span key={`${file.name}-${file.size}`} className="mr-4 text-foreground">{file.name}</span>)}</div>}
          {result?.rows.length ? <div className={cn("mt-4 flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium", previousBalanceVerified ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-300")}>
            {previousBalanceVerified ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {previousBalanceVerified ? "Saldo Anterior confirmado linha por linha." : "Saldo Anterior não foi verificado nesta importação antiga. Reimporte o PDF antes de corrigir."}
          </div> : null}
          {error && <div className="mt-4 flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm font-medium text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
          <AccountingWorkflowSteps steps={[
            { value: "balancete", label: "Balancete", count: result?.rows.length ?? 0 },
            { value: "lancamentos", label: "Lançamentos", count: plan?.adjustments.length ?? 0 },

          ]} />

          <TabsContent value="balancete" className="mt-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Saldos do Calima</h3>
                <p className="mt-1 text-xs text-muted-foreground">{result?.rows.length || 0} linhas lidas sem IA · {flagged.length} fora das regras</p>
              </div>
              <div className="flex items-center gap-2">
                <input className="w-40 rounded border border-input bg-background px-2 py-2 text-xs sm:w-56" placeholder="Buscar conta ou C.R." value={filterText} onChange={event => setFilterText(event.target.value)} />
                <Button type="button" variant={onlyCritical ? "default" : "outline"} size="sm" onClick={() => setOnlyCritical(current => !current)}>Só críticos ({flagged.length})</Button>
              </div>
            </div>
            <BalanceLimitsTable checks={checks.filter(item => (!onlyCritical || item.critical) && (!filterText.trim() || (item.row.title + " " + item.row.reducedCode + " " + item.row.accountCode).toLowerCase().includes(filterText.toLowerCase().trim())))} onEdit={chooseRule} />
            <Dialog open={Boolean(editingCode && editingRule)} onOpenChange={open => { if (!open) { setEditingCode(null); setEditingRule(null); } }}>
              <DialogContent>
                <DialogHeader><DialogTitle>Limites da conta C.R. {editingCode}</DialogTitle><DialogDescription>Regras do filtro. Alterações serão aplicadas às competências desta empresa.</DialogDescription></DialogHeader>
                {editingRule && <div className="space-y-3 text-sm">
                  <label className="block">Natureza esperada
                    <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2" value={editingRule.nature} onChange={e => setEditingRule({ ...editingRule, nature: e.target.value as BalanceLimitRule["nature"] })}>
                      <option value="D">Devedora</option><option value="C">Credora</option><option value="any">Sem natureza fixa</option>
                    </select>
                  </label>
                  <label className="block">Saldo mínimo (R$)
                    <input type="number" min="0" step="0.01" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2" value={editingRule.minInCents / 100} onChange={e => setEditingRule({ ...editingRule, minInCents: Math.round(Math.max(0, Number(e.target.value)) * 100) })} />
                  </label>
                  <label className="block">Saldo máximo (R$)
                    <input type="number" min="0" step="0.01" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2" value={editingRule.maxInCents / 100} onChange={e => setEditingRule({ ...editingRule, maxInCents: Math.round(Math.max(0, Number(e.target.value)) * 100) })} />
                  </label>
                  <label className="block">Margem de tolerância (%)
                    <input type="number" min="0" max="200" step="1" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2" value={editingRule.marginPercent} onChange={e => setEditingRule({ ...editingRule, marginPercent: Math.max(0, Math.min(200, Number(e.target.value))) })} />
                  </label>
                </div>}
                <DialogFooter><Button type="button" variant="outline" onClick={() => { setEditingCode(null); setEditingRule(null); }}>Cancelar</Button><Button type="button" onClick={() => void storeRule()}>Salvar regra</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="lancamentos" className="mt-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background p-4">
              <div>
                <h3 className="text-sm font-semibold">Fechamento de {monthLabel} de {year}</h3>
                <p className="mt-1 text-xs text-muted-foreground">Conferência de Despesas, Folha, Compras e Faturamento com o Balancete importado.</p>
              </div>
              <Button disabled={!result?.rows.length || correcting || !previousBalanceVerified} onClick={() => void correctAutomatically()}>
                {correcting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analisando...</> : <><Sparkles className="mr-2 h-4 w-4" />Analisar e corrigir</>}
              </Button>
            </div>
            {!plan ? <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Execute a análise para visualizar os saldos antes e depois e os lançamentos sugeridos.</div> : <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="Lançamentos propostos" value={String(plan.adjustments.length)} />
                <Metric label="Pendências" value={String(plan.remainingCriticalObservations.length)} />
                <Metric label="Caixa: atual → projetado" value={plan.currentCashSignedInCents === null || plan.projectedCashSignedInCents === null ? "Não localizado" : balance(plan.currentCashSignedInCents) + " → " + balance(plan.projectedCashSignedInCents)} />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>Fontes lidas: {plan.documentSources?.filter(source => source.available).length ?? 0}/4</span>
                {plan.documentSources?.filter(source => !source.available).map(source => <span key={source.module} className="text-amber-700 dark:text-amber-300">Falta {source.module}</span>)}
              </div>
              {plan.aiReview && <p className="rounded-md border border-border bg-background px-4 py-3 text-xs text-muted-foreground">{plan.aiReview.summary}</p>}
              <BalanceChangeList before={result?.rows ?? []} plan={plan} />

              {!planConferable && <p className="text-xs text-amber-700 dark:text-amber-300">O saldo simulado ainda não atende todas as regras. A exportação permanece indisponível.</p>}
              <section className="overflow-hidden rounded-md border border-border bg-background">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
                  <h4 className="text-sm font-semibold">Lançamentos sugeridos ({plan.adjustments.length})</h4>
                  <Button disabled={!planConferable || !plan.adjustments.length} onClick={exportAdjustments} size="sm">Exportar para o Calima</Button>
                </div>
                <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-xs">
                  <thead className="bg-muted/40 text-left text-muted-foreground"><tr><th className="p-3">Data / Histórico</th><th className="p-3">Débito</th><th className="p-3">Crédito</th><th className="p-3 text-right">Valor</th><th className="p-3 text-center">Motivo</th></tr></thead>
                  <tbody>{plan.adjustments.map((entry, i) => <tr key={i} className="border-t border-border">
                    <td className="p-3"><span className="text-muted-foreground">{entry.date}</span><p className="mt-1 font-semibold">{entry.history}</p></td>
                    <td className="p-3 tabular-nums">{entry.debitCode}</td><td className="p-3 tabular-nums">{entry.creditCode}</td>
                    <td className="p-3 text-right tabular-nums">{money(entry.amountInCents)}</td>
                    <td className="p-3 text-center"><HoverCard openDelay={80}><HoverCardTrigger asChild>
                      <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border" aria-label="Ver justificativa"><Info className="h-4 w-4" /></button>
                    </HoverCardTrigger><HoverCardContent align="end" className="w-[370px] max-w-[85vw]">
                      <p className="text-xs font-semibold">{entry.history}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{entry.mappingReason || "Conciliação dos saldos com os módulos importados."}</p>
                      <p className="mt-2 text-xs text-muted-foreground">Uma sugestão de fechamento não comprova pagamento ou recebimento. Confira a documentação.</p>
                    </HoverCardContent></HoverCard></td>
                  </tr>)}</tbody>
                </table></div>
              </section>
              <div className="flex justify-end"><Button type="button" variant="outline" size="sm" onClick={() => setExpanded("preview")}><Maximize2 className="mr-2 h-4 w-4" />Ver balancete projetado completo</Button></div>
            </>}
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
    return <tr key={row.id} className={cn("border-b border-border transition-colors", semanticClass)}><td className="border-r border-border px-2 py-1.5 font-mono text-[11px]">{row.accountCode}</td><td className="border-r border-border px-2 py-1.5"><div className="flex min-w-0 items-center gap-2" style={{ paddingLeft: `${depth * 14}px` }}>{rowObservations.length > 0 && <><ObservationHover observations={rowObservations} />{rowObservations.length > 1 && <span className="shrink-0 rounded bg-red-700 px-1.5 py-0.5 text-[10px] font-bold text-white" title={`${rowObservations.length} problemas nesta conta`}>{rowObservations.length}</span>}</>}<span className={cn("truncate", !isAnalytical && "font-semibold", depth === 0 && "uppercase tracking-wide")}>{row.title}</span>{changed && !rowObservations.length && <span className="shrink-0 rounded-md border border-emerald-800/30 bg-emerald-700 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-sm">AJUSTADO</span>}</div></td><td className="border-r border-border px-2 py-1.5 tabular-nums">{row.reducedCode || "—"}</td><td className="border-r border-border px-2 py-1.5 text-right tabular-nums">{formatAmountNature(row.previousBalanceInCents, row.previousNature)}</td><td className="border-r border-border px-2 py-1.5 text-right tabular-nums">{money(row.debitInCents)}</td><td className="border-r border-border px-2 py-1.5 text-right tabular-nums">{money(row.creditInCents)}</td><td className="px-2 py-1.5 text-right font-semibold tabular-nums">{formatAmountNature(row.currentBalanceInCents, row.currentNature)}</td></tr>;
  })}{!rows.length && <tr><td colSpan={7} className="h-44 text-center text-muted-foreground">{empty}</td></tr>}</tbody></table>;
  if (embedded) return table;
  return <div className="overflow-hidden rounded-md border border-border bg-background"><div className="flex h-8 items-center justify-end border-b border-border px-2">{onExpand && <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onExpand} title="Expandir tabela"><Maximize2 className="h-3.5 w-3.5" /></Button>}</div><div className="overflow-x-auto">{table}</div></div>;
}

function ObservationHover({ observations }: { observations: TrialBalanceObservation[] }) {
  return <HoverCard openDelay={80} closeDelay={80}><HoverCardTrigger asChild><button type="button" className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-red-700 text-white shadow-sm ring-2 ring-red-500/30" aria-label="Ver problema crítico"><CircleAlert className="h-4 w-4" /></button></HoverCardTrigger><HoverCardContent side="right" align="start" className="w-[380px] overflow-hidden border-2 border-red-600/30 p-0 shadow-xl"><div className="bg-red-600/15 px-4 py-3"><p className="text-xs font-extrabold uppercase tracking-wide text-red-800 dark:text-red-200">Problema crítico</p></div><div className="space-y-3 p-4">{observations.map(item => <div key={item.id}><p className="text-sm font-bold text-foreground">{item.headline}</p><p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.message}</p>{item.suggestedSignedInCents !== undefined && <p className="mt-2 text-xs"><span className="text-muted-foreground">Resultado esperado: </span><span className="font-semibold text-foreground">{balance(item.suggestedSignedInCents)}</span></p>}<p className="mt-1 text-[10px] text-muted-foreground">Base: {item.source}</p></div>)}</div></HoverCardContent></HoverCard>;
}

function BalanceLimitsTable({ checks, onEdit }: { checks: import("@/lib/lancamentos/trialBalanceLimits").BalanceLimitCheck[]; onEdit: (row: TrialBalanceRow) => void }) {
  return <div className="overflow-hidden rounded-md border border-border bg-background">
    <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-xs">
      <thead className="bg-muted/40 text-left text-muted-foreground"><tr>
        <th className="p-3">Conta / C.R.</th><th className="p-3 text-right">Saldo ant.</th>
        <th className="p-3 text-right">Débito</th><th className="p-3 text-right">Crédito</th>
        <th className="p-3 text-right">Saldo atual</th><th className="p-3 text-right">Faixa esperada</th><th className="p-3 text-center">Filtro</th>
      </tr></thead>
      <tbody>{checks.map(item => <tr key={item.row.id} className={cn("border-t border-border", item.critical && "bg-red-500/10")}>
        <td className="p-3">
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 shrink-0 rounded-full", item.critical ? "bg-red-500" : "bg-emerald-500")} />
            <div><p className="font-semibold">{item.row.title}</p><p className="text-[10px] text-muted-foreground">{item.row.accountCode} · C.R. {item.row.reducedCode}</p></div>
          </div>
        </td>
        <td className="p-3 text-right tabular-nums">{formatAmountNature(item.row.previousBalanceInCents, item.row.previousNature)}</td>
        <td className="p-3 text-right tabular-nums">{money(item.row.debitInCents)}</td>
        <td className="p-3 text-right tabular-nums">{money(item.row.creditInCents)}</td>
        <td className={cn("p-3 text-right font-semibold tabular-nums", item.critical && "text-red-700 dark:text-red-300")}>{balance(item.signedInCents)}</td>
        <td className="p-3 text-right tabular-nums">{money(item.rule.minInCents)} – {money(item.rule.maxInCents)} {item.rule.nature === "any" ? "" : item.rule.nature}<p className="text-[10px] text-muted-foreground">Margem {item.rule.marginPercent}%</p></td>
        <td className="p-3 text-center">
          <div className="flex items-center justify-center gap-2">
            {item.critical && <HoverCard openDelay={80}><HoverCardTrigger asChild><button type="button" aria-label="Motivos do alerta" className="text-red-600"><CircleAlert className="h-4 w-4" /></button></HoverCardTrigger><HoverCardContent className="text-xs"><p className="font-semibold">Fora do intervalo</p>{item.reasons.map(reason => <p className="mt-1" key={reason}>{reason}</p>)}</HoverCardContent></HoverCard>}
            <button type="button" aria-label={"Configurar conta " + item.row.reducedCode} onClick={() => onEdit(item.row)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><Settings2 className="h-4 w-4" /></button>
          </div>
        </td>
      </tr>)}</tbody>
    </table></div>
    {!checks.length && <p className="p-8 text-center text-xs text-muted-foreground">Nenhuma conta corresponde ao filtro.</p>}
  </div>;
}

function BalanceChangeList({ before, plan }: { before: TrialBalanceRow[]; plan: CriticalTrialBalancePlan }) {
  const original = new Map(before.map(row => [row.id, row]));
  const changes = analyticalTrialBalanceRows(plan.previewRows).flatMap(row => {
    const prior = original.get(row.id);
    if (!prior) return [];
    const oldBalance = signedBalance(prior.currentBalanceInCents, prior.currentNature);
    const newBalance = signedBalance(row.currentBalanceInCents, row.currentNature);
    if (Math.abs(oldBalance - newBalance) <= 1) return [];
    const evidence = plan.adjustments.filter(entry => entry.debitCode === row.reducedCode || entry.creditCode === row.reducedCode);
    return [{ row, oldBalance, newBalance, evidence }];
  });

  return <section className="overflow-hidden rounded-md border border-border bg-background">
    <div className="border-b border-border px-4 py-3">
      <h4 className="text-sm font-semibold">Saldos alterados</h4>
      <p className="mt-1 text-xs text-muted-foreground">Saldo atual do documento → saldo após os lançamentos propostos. O ícone informa a origem da variação.</p>
    </div>
    {changes.length > 0 ? <div className="overflow-x-auto"><table className="w-full min-w-[670px] text-xs">
      <thead className="bg-muted/40 text-left text-muted-foreground"><tr><th className="px-4 py-2">Conta / C.R.</th><th className="px-4 py-2 text-right">Saldo atual</th><th className="px-4 py-2 text-right">Saldo projetado</th><th className="px-3 py-2 text-center">Motivo</th></tr></thead>
      <tbody>{changes.map(item => <tr key={item.row.id} className="border-t border-border">
        <td className="px-4 py-3"><span className="font-semibold">{item.row.title}</span><span className="ml-2 text-muted-foreground">{item.row.reducedCode}</span></td>
        <td className="px-4 py-3 text-right tabular-nums">{balance(item.oldBalance)}</td>
        <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{balance(item.newBalance)}</td>
        <td className="px-3 py-3 text-center"><HoverCard openDelay={80}><HoverCardTrigger asChild>
          <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border" aria-label={"Justificativa da conta " + item.row.title}><Info className="h-4 w-4" /></button>
        </HoverCardTrigger><HoverCardContent align="end" className="w-[370px] max-w-[85vw] space-y-2 text-xs">
          <p className="font-semibold">{item.row.title} · C.R. {item.row.reducedCode}</p>
          <p>Variação: {money(item.newBalance - item.oldBalance)} {item.newBalance > item.oldBalance ? "a débito" : "a crédito"}.</p>
          {item.evidence.map((entry, index) => <div key={index} className="border-t border-border pt-2">
            <p className="font-semibold">{entry.history}</p>
            <p>D {entry.debitCode} / C {entry.creditCode} · {money(entry.amountInCents)}</p>
            <p className="mt-1 text-muted-foreground">{entry.mappingReason || "Partida sugerida com base nos saldos e lançamentos dos módulos."}</p>
          </div>)}
          <p className="border-t border-border pt-2 text-muted-foreground">O saldo novo é uma simulação; a justificativa não substitui o comprovante do fato contábil.</p>
        </HoverCardContent></HoverCard></td>
      </tr>)}</tbody>
    </table></div> : <p className="px-4 py-6 text-xs text-muted-foreground">Nenhum saldo alterado. Consulte as pendências do fechamento.</p>}
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-md border border-border bg-background px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold tabular-nums">{value}</p></div>; }
function CheckCard({ label, ok, detail }: { label: string; ok: boolean; detail: string }) { return <div className={cn("rounded-md border-2 p-4", ok ? "border-emerald-600/35 bg-emerald-500/12" : "border-red-600/40 bg-red-600/12")}><div className="flex items-center gap-2">{ok ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : <AlertTriangle className="h-4 w-4 text-red-700" />}<p className="text-sm font-semibold">{label}</p></div><p className="mt-2 text-xs text-muted-foreground">{detail}</p></div>; }
function formatAmountNature(amount: number, nature: string) { return !amount || !nature ? "0,00" : `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount / 100)} ${nature}`; }
function groupObservations(items: TrialBalanceObservation[]) { const map = new Map<string, TrialBalanceObservation[]>(); for (const item of items) map.set(item.rowId, [...(map.get(item.rowId) ?? []), item]); return map; }
function readContext(company: string): SavedContext | null { try { const raw = localStorage.getItem(contextKey(company)); return raw ? JSON.parse(raw) as SavedContext : null; } catch { return null; } }
function asBase64(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] || ""); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); }); }
async function functionError(reason: unknown, fallback: string) { let message = reason instanceof Error ? reason.message : fallback; try { const response = (reason as { context?: Response }).context; if (response) { const payload = await response.clone().json(); message = payload?.error || message; } } catch { /* mantém mensagem original */ } return new Error(message); }
