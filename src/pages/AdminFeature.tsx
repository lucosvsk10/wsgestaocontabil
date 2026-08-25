import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, KeyRound, LockKeyhole, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type FiscalForm = {
  cnpjPrestador: string;
  municipioEmissor: string;
  simples: string;
  cnpjTomador: string;
  cpfTomador: string;
  municipioPrestacao: string;
  codigoTributacao: string;
  descricao: string;
  valor: string;
  tributacaoIss: string;
  serie: string;
  numero: string;
};

type FeatureResult = {
  ok?: boolean;
  valid?: boolean;
  errors?: string[];
  warnings?: string[];
  reference?: string;
  payload?: Record<string, unknown>;
  provider?: string;
  environment?: string;
  status?: number;
  response?: unknown;
};

const emptyForm: FiscalForm = {
  cnpjPrestador: "",
  municipioEmissor: "",
  simples: "1",
  cnpjTomador: "",
  cpfTomador: "",
  municipioPrestacao: "",
  codigoTributacao: "",
  descricao: "",
  valor: "",
  tributacaoIss: "1",
  serie: "1",
  numero: "1",
};

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (!error) return data as T;
  let message = error.message;
  try {
    const context = (error as { context?: Response }).context;
    if (context) {
      const payload = await context.clone().json();
      message = payload?.error || message;
    }
  } catch { /* noop */ }
  throw new Error(message);
}

export default function AdminFeature() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [focusToken, setFocusToken] = useState("");
  const [form, setForm] = useState<FiscalForm>(emptyForm);
  const [reference, setReference] = useState("");
  const [result, setResult] = useState<FeatureResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<"validate" | "issue" | "query" | null>(null);

  const canIssue = useMemo(() => Boolean(focusToken.trim() && form.cnpjPrestador && form.municipioEmissor && form.codigoTributacao && form.descricao && Number(form.valor) > 0), [focusToken, form]);

  const authenticate = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true); setError("");
    try {
      const data = await invoke<{ token: string }>("accounting-engine", { action: "unlock", password });
      setToken(data.token); setPassword("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao desbloquear.");
    } finally { setLoading(false); }
  };

  const update = (key: keyof FiscalForm, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const request = async (kind: "validate" | "issue") => {
    setAction(kind); setError(""); setResult(null);
    try {
      const data = await invoke<FeatureResult>("nfse-feature", {
        action: kind,
        engine_token: token,
        provider_token: focusToken,
        environment: "homologacao",
        data: form,
      });
      setResult(data);
      if (data.reference) setReference(data.reference);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha no teste fiscal.");
    } finally { setAction(null); }
  };

  const query = async () => {
    setAction("query"); setError(""); setResult(null);
    try {
      const data = await invoke<FeatureResult>("nfse-feature", {
        action: "query",
        engine_token: token,
        provider_token: focusToken,
        environment: "homologacao",
        reference,
      });
      setResult(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao consultar.");
    } finally { setAction(null); }
  };

  return <AdminLayout><main className="mx-auto w-full max-w-[1500px] px-6 py-6">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Laboratório interno</p>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-3xl font-semibold text-foreground">Feature</h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><LockKeyhole className="h-3 w-3"/>Protegido</span>
        </div>
      </div>
      {token && <Button variant="ghost" onClick={() => { setToken(""); setResult(null); setError(""); }}><LockKeyhole className="mr-2 h-4 w-4"/>Bloquear</Button>}
    </header>

    {!token ? <section className="mx-auto mt-16 max-w-md rounded-lg border border-border bg-background p-8 shadow-sm">
      <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-full bg-muted"><KeyRound className="h-5 w-5"/></div>
      <h2 className="text-xl font-semibold">Desbloquear Feature</h2>
      <p className="mt-2 text-sm text-muted-foreground">Use a mesma senha da Engine.</p>
      <form onSubmit={authenticate} className="mt-6 space-y-4">
        <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha da Engine" required />
        {error && <p className="flex gap-2 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>{error}</p>}
        <Button className="w-full" type="submit" disabled={loading}>{loading ? "Verificando..." : "Entrar"}</Button>
      </form>
    </section> : <div className="mt-7 space-y-6">
      <section className="grid gap-3 md:grid-cols-3">
        <MiniStatus label="Ambiente" value="Homologação" />
        <MiniStatus label="Documento" value="NFS-e Nacional" />
        <MiniStatus label="Motor" value="Focus NFe / API" />
      </section>

      <section className="rounded-lg border border-border bg-background p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[260px] flex-1"><FieldLabel>Token Focus NFe</FieldLabel><Input type="password" value={focusToken} onChange={(event) => setFocusToken(event.target.value)} placeholder="Token de homologação" /></div>
          <div className="pb-2 text-xs text-muted-foreground">Usado somente nesta sessão. Não é salvo.</div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <section className="rounded-lg border border-border bg-background p-5">
          <div className="mb-5 flex items-center justify-between"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Emissão</p><h2 className="mt-1 text-lg font-semibold">Dados da DPS</h2></div><ShieldCheck className="h-5 w-5 text-muted-foreground"/></div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="CNPJ prestador"><Input value={form.cnpjPrestador} onChange={(e) => update("cnpjPrestador", e.target.value)} placeholder="Somente números"/></Field>
            <Field label="Município emissor · IBGE"><Input value={form.municipioEmissor} onChange={(e) => update("municipioEmissor", e.target.value)} placeholder="7 dígitos"/></Field>
            <Field label="Simples Nacional"><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.simples} onChange={(e) => update("simples", e.target.value)}><option value="1">Não optante</option><option value="2">MEI</option><option value="3">ME/EPP</option></select></Field>
            <Field label="Município da prestação · IBGE"><Input value={form.municipioPrestacao} onChange={(e) => update("municipioPrestacao", e.target.value)} placeholder="7 dígitos"/></Field>
            <Field label="CNPJ tomador"><Input value={form.cnpjTomador} onChange={(e) => update("cnpjTomador", e.target.value)} placeholder="Opcional"/></Field>
            <Field label="CPF tomador"><Input value={form.cpfTomador} onChange={(e) => update("cpfTomador", e.target.value)} placeholder="Opcional"/></Field>
            <Field label="Código tributação nacional ISS"><Input value={form.codigoTributacao} onChange={(e) => update("codigoTributacao", e.target.value)} placeholder="Ex.: 010701"/></Field>
            <Field label="Valor do serviço"><Input type="number" step="0.01" value={form.valor} onChange={(e) => update("valor", e.target.value)} placeholder="0,00"/></Field>
            <Field label="Série DPS"><Input type="number" value={form.serie} onChange={(e) => update("serie", e.target.value)}/></Field>
            <Field label="Número DPS"><Input type="number" value={form.numero} onChange={(e) => update("numero", e.target.value)}/></Field>
            <Field label="Tributação ISS"><Input type="number" value={form.tributacaoIss} onChange={(e) => update("tributacaoIss", e.target.value)}/></Field>
            <div className="md:col-span-2"><FieldLabel>Descrição do serviço</FieldLabel><textarea className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.descricao} onChange={(e) => update("descricao", e.target.value)} placeholder="Serviço prestado"/></div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 border-t border-border pt-5">
            <Button variant="outline" onClick={() => request("validate")} disabled={Boolean(action)}>{action === "validate" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle2 className="mr-2 h-4 w-4"/>}Validar</Button>
            <Button onClick={() => request("issue")} disabled={Boolean(action) || !canIssue}>{action === "issue" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}Emitir teste</Button>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-background p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Consulta</p>
            <div className="mt-3 flex gap-2"><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Referência da emissão"/><Button variant="outline" onClick={query} disabled={!reference || !focusToken || Boolean(action)}>{action === "query" ? <RefreshCw className="h-4 w-4 animate-spin"/> : "Consultar"}</Button></div>
          </section>

          <section className="rounded-lg border border-border bg-background p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Retorno</p>
            {error ? <p className="mt-4 flex gap-2 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>{error}</p> : result ? <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2 text-xs">{typeof result.valid === "boolean" && <Badge ok={result.valid}>{result.valid ? "Payload válido" : "Payload incompleto"}</Badge>}{result.status && <span className="rounded-full bg-muted px-2.5 py-1">HTTP {result.status}</span>}{result.reference && <span className="rounded-full bg-muted px-2.5 py-1">{result.reference}</span>}</div>
              {result.errors?.length ? <div><p className="text-xs font-medium text-destructive">Pendências</p><ul className="mt-2 space-y-1 text-sm text-destructive">{result.errors.map((item) => <li key={item}>• {item}</li>)}</ul></div> : null}
              <pre className="max-h-[480px] overflow-auto rounded-md bg-muted/50 p-4 text-[11px] leading-5 text-foreground">{JSON.stringify(result.response ?? result.payload ?? result, null, 2)}</pre>
            </div> : <p className="mt-4 text-sm text-muted-foreground">Valide ou envie uma DPS para ver o retorno da API.</p>}
          </section>
        </div>
      </div>
    </div>}
  </main></AdminLayout>;
}

function FieldLabel({ children }: { children: React.ReactNode }) { return <label className="mb-2 block text-xs font-medium text-muted-foreground">{children}</label>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><FieldLabel>{label}</FieldLabel>{children}</div>; }
function MiniStatus({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-border bg-background px-4 py-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>; }
function Badge({ ok, children }: { ok: boolean; children: React.ReactNode }) { return <span className={`rounded-full px-2.5 py-1 ${ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-destructive/10 text-destructive"}`}>{children}</span>; }
