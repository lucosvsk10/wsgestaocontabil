import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock3, Cpu, DollarSign, Gauge, KeyRound, LockKeyhole, RefreshCw, Settings2, ShieldCheck, TestTube2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type EngineStatus = {
  provider: string;
  model: string;
  apiConfigured: boolean;
  price: { input: number; cached: number; output: number } | null;
  totals: { requests: number; success: number; errors: number; inputTokens: number; outputTokens: number; totalTokens: number; estimatedCostUsd: number };
  official: {
    configured: boolean;
    available: boolean;
    error: string | null;
    totals: { costUsd: number; inputTokens: number; cachedInputTokens: number; outputTokens: number; requests: number };
    daily: Array<{ startTime: number; endTime: number; costUsd: number; inputTokens: number; cachedInputTokens: number; outputTokens: number; requests: number }>;
  };
  lastRequest: { status: "success" | "error"; created_at: string; latency_ms: number; error_message?: string | null } | null;
  recent: Array<{ id: string; createdAt: string; companyKey?: string | null; competence?: string | null; module: string; model: string; status: "success" | "error"; inputTokens: number; outputTokens: number; totalTokens: number; estimatedCostUsd: number; latencyMs: number; errorCode?: string | null; errorMessage?: string | null }>;
};

const LEGACY_TOKEN_KEY = "ws-accounting-engine-token";
const number = new Intl.NumberFormat("pt-BR");
const usd = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD", minimumFractionDigits: 4, maximumFractionDigits: 6 });
const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" });

async function invokeEngine<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("accounting-engine", { body });
  if (!error) return data as T;
  let message = error.message;
  try {
    const context = (error as { context?: Response }).context;
    if (context) {
      const payload = await context.clone().json();
      message = payload?.error || message;
    }
  } catch { /* mantém a mensagem original */ }
  throw new Error(message);
}

export default function AdminEngine() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<EngineStatus | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  const loadStatus = useCallback(async (engineToken: string) => {
    const next = await invokeEngine<EngineStatus>({ action: "status", engine_token: engineToken });
    setStatus(next);
  }, []);

  useEffect(() => {
    // A autorização da Engine vale somente enquanto esta tela estiver aberta.
    // Remove também tokens persistidos por versões anteriores do painel.
    sessionStorage.removeItem(LEGACY_TOKEN_KEY);
    let active = true;
    void (async () => {
      try {
        const bootstrap = await invokeEngine<{ configured: boolean }>({ action: "bootstrap" });
        if (!active) return;
        setConfigured(bootstrap.configured);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Não foi possível abrir a Engine.");
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  const successRate = useMemo(() => status?.totals.requests ? (status.totals.success / status.totals.requests) * 100 : 0, [status]);

  const authenticate = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      if (!configured && password !== confirmation) throw new Error("As senhas não coincidem.");
      const result = await invokeEngine<{ token: string }>({ action: configured ? "unlock" : "set_password", password });
      setToken(result.token); setConfigured(true); setPassword(""); setConfirmation("");
      await loadStatus(result.token);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Falha ao desbloquear a Engine."); }
    finally { setLoading(false); }
  };

  const refresh = async () => {
    setLoading(true); setError("");
    try { await loadStatus(token); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Falha ao atualizar."); }
    finally { setLoading(false); }
  };

  const testConnection = async () => {
    setTesting(true); setError("");
    try { await invokeEngine({ action: "test_connection", engine_token: token }); await loadStatus(token); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "A OpenAI recusou o teste."); await loadStatus(token).catch(() => undefined); }
    finally { setTesting(false); }
  };

  const lock = () => { setToken(""); setStatus(null); setError(""); };

  return <AdminLayout><main className="mx-auto w-full max-w-[1720px] px-6 py-6">
    <header className="flex flex-wrap items-end justify-between gap-5 border-b border-border pb-5">
      <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Operação contábil</p><div className="mt-1 flex items-center gap-3"><Settings2 className="h-7 w-7 text-muted-foreground"/><h1 className="text-3xl font-semibold text-foreground">Engine</h1><span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><LockKeyhole className="h-3 w-3"/>Protegido</span></div></div>
      {token && <div className="flex gap-2"><Button variant="outline" onClick={refresh} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}/>Atualizar</Button><Button variant="ghost" onClick={lock}><LockKeyhole className="mr-2 h-4 w-4"/>Bloquear</Button></div>}
    </header>

    {!token ? <section className="mx-auto mt-16 max-w-md rounded-lg border border-border bg-background p-8 shadow-sm">
      <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-full bg-muted"><KeyRound className="h-5 w-5 text-foreground"/></div>
      <h2 className="text-xl font-semibold text-foreground">{configured === false ? "Criar acesso da Engine" : "Desbloquear Engine"}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{configured === false ? "Defina a senha exclusiva deste painel. Ela será protegida no servidor e não ficará visível no site." : "Informe a senha exclusiva para consultar integração, consumo, custos e diagnósticos."}</p>
      <form className="mt-7 space-y-4" onSubmit={authenticate}><div><label className="mb-2 block text-xs font-medium text-muted-foreground">Senha da Engine</label><Input type="password" autoComplete="current-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required/></div>
        {configured === false && <div><label className="mb-2 block text-xs font-medium text-muted-foreground">Confirmar senha</label><Input type="password" autoComplete="new-password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required/></div>}
        {error && <p className="flex gap-2 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>{error}</p>}
        <Button className="w-full" type="submit" disabled={loading || configured === null}>{loading ? "Verificando..." : configured === false ? "Criar senha e acessar" : "Desbloquear"}</Button>
      </form>
    </section> : <div className="mt-8 space-y-8">
      {error && <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/><span>{error}</span></div>}
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Cpu} label="Modelo ativo" value={status?.model || "—"} detail={status?.provider || "OpenAI"}/>
        <Metric icon={Activity} label="Chamadas locais · 30 dias" value={number.format(status?.totals.requests || 0)} detail={`${number.format(status?.totals.errors || 0)} com erro`}/>
        <Metric icon={Gauge} label="Tokens oficiais · 30 dias" value={status?.official.available ? number.format(status.official.totals.inputTokens + status.official.totals.outputTokens) : "—"} detail={status?.official.available ? `${number.format(status.official.totals.requests)} chamadas na organização` : "Admin API ainda não conectada"}/>
        <Metric icon={DollarSign} label="Custo oficial · 30 dias" value={status?.official.available ? usd.format(status.official.totals.costUsd) : "—"} detail={status?.official.available ? "Consumo realizado; não é o saldo pré-pago" : "Sem estimativa exibida como valor oficial"}/>
      </section>

      <section className="rounded-lg border border-border bg-background p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conta OpenAI</p><h2 className="mt-2 text-lg font-semibold text-foreground">Uso e cobrança oficiais</h2></div><StatusPill ok={Boolean(status?.official.available)} label={status?.official.available ? "Dados oficiais conectados" : status?.official.configured ? "Consulta recusada" : "Admin API pendente"}/></div>
        {status?.official.available ? <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><OfficialValue label="Custo da organização" value={usd.format(status.official.totals.costUsd)}/><OfficialValue label="Requisições" value={number.format(status.official.totals.requests)}/><OfficialValue label="Tokens de entrada" value={number.format(status.official.totals.inputTokens)}/><OfficialValue label="Tokens de saída" value={number.format(status.official.totals.outputTokens)}/></div> : <div className="mt-6 rounded-md bg-muted/50 px-4 py-4"><p className="text-sm font-medium text-foreground">{status?.official.error || "A consulta oficial ainda não está disponível."}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">A chave normal processa documentos. A chave administrativa é separada e serve apenas para consultar uso e custos da organização; nenhum segredo é enviado ao navegador.</p></div>}
        <div className="mt-4 flex flex-col gap-1 rounded-md border border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6"><div><p className="text-sm font-medium text-foreground">Saldo pré-pago</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Os endpoints administrativos oficiais retornam uso e custos, mas não disponibilizam o saldo de créditos comprado.</p></div><span className="shrink-0 text-xs font-medium text-muted-foreground">Consultar no Billing da OpenAI</span></div>
        {status?.official.available && <div className="mt-6 overflow-x-auto border-t border-border pt-5"><table className="w-full min-w-[720px] text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="pb-3 font-medium">Dia</th><th className="pb-3 text-right font-medium">Chamadas</th><th className="pb-3 text-right font-medium">Entrada</th><th className="pb-3 text-right font-medium">Saída</th><th className="pb-3 text-right font-medium">Custo oficial</th></tr></thead><tbody>{status.official.daily.slice(0, 10).map((row) => <tr key={row.startTime} className="border-t border-border/70"><td className="py-3">{new Date(row.startTime * 1000).toLocaleDateString("pt-BR")}</td><td className="py-3 text-right tabular-nums">{number.format(row.requests)}</td><td className="py-3 text-right tabular-nums">{number.format(row.inputTokens)}</td><td className="py-3 text-right tabular-nums">{number.format(row.outputTokens)}</td><td className="py-3 text-right tabular-nums">{usd.format(row.costUsd)}</td></tr>)}</tbody></table></div>}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-lg border border-border bg-background p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Integração</p><h2 className="mt-2 text-lg font-semibold text-foreground">OpenAI Responses API</h2></div><StatusPill ok={Boolean(status?.apiConfigured)} label={status?.apiConfigured ? "Chave configurada" : "Chave ausente"}/></div>
          <dl className="mt-7 grid gap-x-8 gap-y-5 sm:grid-cols-2"><Info label="Provedor" value={status?.provider || "—"}/><Info label="Modelo em produção" value={status?.model || "—"}/><Info label="Endpoint" value="Responses API"/><Info label="Autenticação" value="Secret no Supabase"/><Info label="Última chamada" value={status?.lastRequest ? dateTime.format(new Date(status.lastRequest.created_at)) : "Sem chamadas registradas"}/><Info label="Latência mais recente" value={status?.lastRequest ? `${number.format(status.lastRequest.latency_ms)} ms` : "—"}/></dl>
          <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-border pt-5"><Button onClick={testConnection} disabled={testing || !status?.apiConfigured}><TestTube2 className="mr-2 h-4 w-4"/>{testing ? "Testando..." : "Testar conexão"}</Button><p className="text-xs text-muted-foreground">O teste faz uma chamada mínima e também entra na telemetria.</p></div>
        </div>
        <div className="rounded-lg border border-border bg-background p-6"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saúde operacional</p><div className="mt-5 flex items-end justify-between"><div><p className="text-4xl font-semibold text-foreground">{status?.totals.requests ? `${successRate.toFixed(1).replace(".", ",")}%` : "—"}</p><p className="mt-2 text-sm text-muted-foreground">taxa de sucesso em 30 dias</p></div>{status?.lastRequest?.status === "error" ? <AlertTriangle className="h-8 w-8 text-destructive"/> : <ShieldCheck className="h-8 w-8 text-muted-foreground"/>}</div>
          <div className="mt-7 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-foreground transition-all" style={{ width: `${status?.totals.requests ? successRate : 0}%` }}/></div>
          <div className="mt-7 border-t border-border pt-5"><p className="text-xs text-muted-foreground">Preço de referência do modelo</p>{status?.price ? <div className="mt-3 grid grid-cols-3 gap-3 text-sm"><Price label="Entrada" value={status.price.input}/><Price label="Cache" value={status.price.cached}/><Price label="Saída" value={status.price.output}/></div> : <p className="mt-2 text-sm text-muted-foreground">Tabela de preço ainda não cadastrada para este modelo.</p>}</div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-background"><div className="flex items-center justify-between border-b border-border px-6 py-5"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Telemetria</p><h2 className="mt-1 text-lg font-semibold text-foreground">Chamadas recentes</h2></div><span className="text-xs text-muted-foreground">Últimos 30 dias</span></div><div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-sm"><thead className="bg-muted/40 text-left text-xs text-muted-foreground"><tr>{["Data", "Módulo", "Empresa / competência", "Modelo", "Estado", "Tokens", "Custo estimado", "Latência", "Diagnóstico"].map((label) => <th key={label} className="border-b border-border px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody>{status?.recent.map((row) => <tr key={row.id} className="border-b border-border/70 last:border-0"><td className="whitespace-nowrap px-4 py-3">{dateTime.format(new Date(row.createdAt))}</td><td className="px-4 py-3 capitalize">{row.module}</td><td className="max-w-[220px] truncate px-4 py-3" title={row.companyKey || ""}>{row.companyKey || "—"}{row.competence ? ` · ${row.competence}` : ""}</td><td className="whitespace-nowrap px-4 py-3">{row.model}</td><td className="px-4 py-3"><StatusPill ok={row.status === "success"} label={row.status === "success" ? "Sucesso" : "Erro"}/></td><td className="px-4 py-3 text-right tabular-nums">{number.format(row.totalTokens)}</td><td className="px-4 py-3 text-right tabular-nums">{usd.format(Number(row.estimatedCostUsd))}</td><td className="px-4 py-3 text-right tabular-nums">{number.format(row.latencyMs)} ms</td><td className="max-w-[300px] px-4 py-3 text-muted-foreground"><span className="line-clamp-2" title={row.errorMessage || ""}>{row.errorMessage || row.errorCode || "Sem ocorrências"}</span></td></tr>)}{!status?.recent.length && <tr><td colSpan={9} className="h-40 text-center text-muted-foreground">Nenhuma chamada registrada após a ativação da telemetria.</td></tr>}</tbody></table></div></section>
    </div>}
  </main></AdminLayout>;
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Activity; label: string; value: string; detail: string }) { return <div className="rounded-lg border border-border bg-background p-5"><div className="flex items-center justify-between"><p className="text-xs font-medium text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-muted-foreground"/></div><p className="mt-4 truncate text-2xl font-semibold text-foreground" title={value}>{value}</p><p className="mt-2 truncate text-xs text-muted-foreground">{detail}</p></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-sm font-medium text-foreground">{value}</dd></div>; }
function Price({ label, value }: { label: string; value: number }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium text-foreground">US$ {value.toFixed(2)}<span className="text-xs font-normal text-muted-foreground"> / 1M</span></p></div>; }
function OfficialValue({ label, value }: { label: string; value: string }) { return <div className="rounded-md bg-muted/40 px-4 py-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-xl font-semibold text-foreground">{value}</p></div>; }
function StatusPill({ ok, label }: { ok: boolean; label: string }) { return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${ok ? "bg-foreground text-background" : "bg-destructive/10 text-destructive"}`}>{ok ? <CheckCircle2 className="h-3 w-3"/> : <Clock3 className="h-3 w-3"/>}{label}</span>; }
