import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileKey2, KeyRound, LockKeyhole, RefreshCw, Send } from "lucide-react";
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
  nomeTomador: string;
  municipioPrestacao: string;
  codigoTributacao: string;
  descricao: string;
  valor: string;
  tributacaoIss: string;
  serie: string;
  numero: string;
};

type CertificateInfo = {
  cnpj?: string | null;
  cpf?: string | null;
  nome?: string | null;
  validadeInicio?: string;
  validadeFim?: string;
  validoAgora?: boolean;
};

type FeatureResult = {
  ok?: boolean;
  connected?: boolean;
  valid?: boolean;
  signed?: boolean;
  errors?: Array<string | Record<string, unknown>>;
  warnings?: string[];
  certificate?: CertificateInfo;
  idDps?: string;
  chaveAcesso?: string;
  status?: number | null;
  note?: string;
  response?: unknown;
  xml?: string;
  nfseXml?: string;
};

const emptyForm: FiscalForm = {
  cnpjPrestador: "",
  municipioEmissor: "",
  simples: "1",
  cnpjTomador: "",
  cpfTomador: "",
  nomeTomador: "",
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
      const details = Array.isArray(payload?.errors)
        ? payload.errors.map((item: unknown) => typeof item === "string" ? item : JSON.stringify(item)).join(" · ")
        : "";
      message = [payload?.error || message, details].filter(Boolean).join(" — ");
    }
  } catch { /* noop */ }
  throw new Error(message);
}

async function fileToBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export default function AdminFeature() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [certificateBase64, setCertificateBase64] = useState("");
  const [certificatePassword, setCertificatePassword] = useState("");
  const [certificateName, setCertificateName] = useState("");
  const [certificate, setCertificate] = useState<CertificateInfo | null>(null);
  const [form, setForm] = useState<FiscalForm>(emptyForm);
  const [reference, setReference] = useState("");
  const [result, setResult] = useState<FeatureResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<string | null>(null);

  const hasCertificate = Boolean(certificateBase64 && certificatePassword);
  const canIssue = useMemo(() => Boolean(
    hasCertificate &&
    form.cnpjPrestador &&
    form.municipioEmissor &&
    form.codigoTributacao &&
    form.descricao &&
    Number(form.valor) > 0
  ), [hasCertificate, form]);

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

  const securePayload = (kind: string, extra: Record<string, unknown> = {}) => ({
    action: kind,
    engine_token: token,
    environment: "homologacao",
    certificate_base64: certificateBase64,
    certificate_password: certificatePassword,
    data: form,
    ...extra,
  });

  const chooseCertificate = async (file?: File) => {
    setCertificate(null); setResult(null); setError("");
    if (!file) {
      setCertificateBase64(""); setCertificateName("");
      return;
    }
    setCertificateName(file.name);
    try {
      setCertificateBase64(await fileToBase64(file));
    } catch {
      setError("Não foi possível ler o certificado selecionado.");
    }
  };

  const inspectCertificate = async () => {
    setAction("certificate"); setError(""); setResult(null);
    try {
      const data = await invoke<FeatureResult>("nfse-feature", securePayload("inspect_certificate"));
      setCertificate(data.certificate || null);
      if (data.certificate?.cnpj) update("cnpjPrestador", data.certificate.cnpj);
      setResult(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao abrir o certificado.");
    } finally { setAction(null); }
  };

  const request = async (kind: "validate" | "test_connection" | "preview" | "issue") => {
    setAction(kind); setError(""); setResult(null);
    try {
      const body = kind === "validate"
        ? { action: kind, engine_token: token, environment: "homologacao", data: form }
        : securePayload(kind);
      const data = await invoke<FeatureResult>("nfse-feature", body);
      setResult(data);
      if (data.certificate) setCertificate(data.certificate);
      if (data.chaveAcesso) setReference(data.chaveAcesso);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha no teste da NFS-e.");
    } finally { setAction(null); }
  };

  const query = async () => {
    setAction("query"); setError(""); setResult(null);
    try {
      const data = await invoke<FeatureResult>("nfse-feature", securePayload("query", { reference }));
      setResult(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao consultar a NFS-e.");
    } finally { setAction(null); }
  };

  const lock = () => {
    setToken(""); setResult(null); setError(""); setCertificate(null);
    setCertificateBase64(""); setCertificatePassword(""); setCertificateName("");
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
      {token && <Button variant="ghost" onClick={lock}><LockKeyhole className="mr-2 h-4 w-4"/>Bloquear</Button>}
    </header>

    {!token ? <section className="mx-auto mt-16 max-w-md rounded-lg border border-border bg-background p-8 shadow-sm">
      <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-full bg-muted"><KeyRound className="h-5 w-5"/></div>
      <h2 className="text-xl font-semibold">Desbloquear Feature</h2>
      <p className="mt-2 text-sm text-muted-foreground">Use a mesma senha da Engine.</p>
      <form onSubmit={authenticate} className="mt-6 space-y-4">
        <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha da Engine" required />
        {error && <ErrorText>{error}</ErrorText>}
        <Button className="w-full" type="submit" disabled={loading}>{loading ? "Verificando..." : "Entrar"}</Button>
      </form>
    </section> : <div className="mt-7 space-y-6">
      <section className="grid gap-3 md:grid-cols-3">
        <MiniStatus label="Ambiente" value="Produção restrita" />
        <MiniStatus label="Destino" value="SEFIN Nacional" />
        <MiniStatus label="API por nota" value="R$ 0,00" />
      </section>

      <section className="rounded-lg border border-border bg-background p-5">
        <div className="mb-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">Credencial fiscal</p><h2 className="mt-1 text-lg font-semibold">Certificado A1</h2></div>
        <div className="grid gap-4 lg:grid-cols-[1fr_320px_auto] lg:items-end">
          <div><FieldLabel>Arquivo .pfx ou .p12</FieldLabel><Input type="file" accept=".pfx,.p12,application/x-pkcs12" onChange={(e) => chooseCertificate(e.target.files?.[0])}/>{certificateName && <p className="mt-1 text-xs text-muted-foreground">{certificateName}</p>}</div>
          <div><FieldLabel>Senha do certificado</FieldLabel><Input type="password" value={certificatePassword} onChange={(e) => setCertificatePassword(e.target.value)} placeholder="Senha do A1"/></div>
          <Button variant="outline" onClick={inspectCertificate} disabled={!hasCertificate || Boolean(action)}>{action === "certificate" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin"/> : <FileKey2 className="mr-2 h-4 w-4"/>}Ler certificado</Button>
        </div>
        {certificate && <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
          <Info label="Titular" value={certificate.nome || "—"}/>
          <Info label="CNPJ" value={certificate.cnpj || certificate.cpf || "—"}/>
          <Info label="Validade" value={certificate.validadeFim ? new Date(certificate.validadeFim).toLocaleDateString("pt-BR") : "—"}/>
        </div>}
        <p className="mt-3 text-xs text-muted-foreground">O arquivo e a senha são usados somente nesta sessão de teste e não são gravados no banco.</p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <section className="rounded-lg border border-border bg-background p-5">
          <div className="mb-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">Emissão</p><h2 className="mt-1 text-lg font-semibold">DPS de teste</h2></div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="CNPJ prestador"><Input value={form.cnpjPrestador} onChange={(e) => update("cnpjPrestador", e.target.value)} placeholder="Preenchido pelo certificado"/></Field>
            <Field label="Município emissor · IBGE"><Input value={form.municipioEmissor} onChange={(e) => update("municipioEmissor", e.target.value)} placeholder="7 dígitos"/></Field>
            <Field label="Simples Nacional"><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.simples} onChange={(e) => update("simples", e.target.value)}><option value="1">Não optante</option><option value="2">MEI</option><option value="3">ME/EPP</option></select></Field>
            <Field label="Município da prestação · IBGE"><Input value={form.municipioPrestacao} onChange={(e) => update("municipioPrestacao", e.target.value)} placeholder="Se igual, repita o emissor"/></Field>
            <Field label="CNPJ tomador"><Input value={form.cnpjTomador} onChange={(e) => update("cnpjTomador", e.target.value)} placeholder="Opcional"/></Field>
            <Field label="CPF tomador"><Input value={form.cpfTomador} onChange={(e) => update("cpfTomador", e.target.value)} placeholder="Opcional"/></Field>
            <div className="md:col-span-2"><Field label="Nome / razão social do tomador"><Input value={form.nomeTomador} onChange={(e) => update("nomeTomador", e.target.value)} placeholder="Obrigatório se informar CPF/CNPJ do tomador"/></Field></div>
            <Field label="Código tributação nacional"><Input value={form.codigoTributacao} onChange={(e) => update("codigoTributacao", e.target.value)} placeholder="6 dígitos · ex.: 010101"/></Field>
            <Field label="Valor do serviço"><Input type="number" min="0" step="0.01" value={form.valor} onChange={(e) => update("valor", e.target.value)} placeholder="0,00"/></Field>
            <Field label="Série DPS"><Input inputMode="numeric" value={form.serie} onChange={(e) => update("serie", e.target.value)}/></Field>
            <Field label="Número DPS"><Input inputMode="numeric" value={form.numero} onChange={(e) => update("numero", e.target.value)}/></Field>
            <Field label="Tributação ISS"><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.tributacaoIss} onChange={(e) => update("tributacaoIss", e.target.value)}><option value="1">Tributável</option><option value="2">Imune</option><option value="3">Exportação</option><option value="4">Não incidência</option></select></Field>
            <div className="md:col-span-2"><FieldLabel>Descrição do serviço</FieldLabel><textarea className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.descricao} onChange={(e) => update("descricao", e.target.value)} placeholder="Serviço prestado"/></div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 border-t border-border pt-5">
            <Button variant="outline" onClick={() => request("validate")} disabled={Boolean(action)}>{action === "validate" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle2 className="mr-2 h-4 w-4"/>}Validar dados</Button>
            <Button variant="outline" onClick={() => request("test_connection")} disabled={!canIssue || Boolean(action)}>{action === "test_connection" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin"/> : null}Testar governo</Button>
            <Button variant="outline" onClick={() => request("preview")} disabled={!canIssue || Boolean(action)}>{action === "preview" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin"/> : null}Gerar DPS</Button>
            <Button onClick={() => request("issue")} disabled={!canIssue || Boolean(action)}>{action === "issue" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}Emitir teste</Button>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-background p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Consultar NFS-e</p>
            <div className="mt-3 flex gap-2"><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Chave de acesso · 50 dígitos"/><Button variant="outline" onClick={query} disabled={!reference || !hasCertificate || Boolean(action)}>{action === "query" ? <RefreshCw className="h-4 w-4 animate-spin"/> : "Consultar"}</Button></div>
          </section>

          <section className="rounded-lg border border-border bg-background p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Retorno</p>
            {error ? <div className="mt-4"><ErrorText>{error}</ErrorText></div> : result ? <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2 text-xs">
                {result.connected && <Badge ok>Conectado à SEFIN</Badge>}
                {typeof result.valid === "boolean" && <Badge ok={result.valid}>{result.valid ? "Dados válidos" : "Pendências"}</Badge>}
                {result.signed && <Badge ok>DPS assinada</Badge>}
                {result.status && <span className="rounded-full bg-muted px-2.5 py-1">HTTP {result.status}</span>}
              </div>
              {result.chaveAcesso && <div><p className="text-xs text-muted-foreground">Chave de acesso</p><p className="mt-1 break-all text-sm font-medium">{result.chaveAcesso}</p></div>}
              {result.idDps && <Info label="ID da DPS" value={result.idDps}/>}              
              {result.note && <p className="text-sm text-muted-foreground">{result.note}</p>}
              {result.warnings?.length ? <div><p className="text-xs font-medium text-amber-700 dark:text-amber-300">Avisos</p><ul className="mt-2 space-y-1 text-sm text-muted-foreground">{result.warnings.map((item) => <li key={item}>• {item}</li>)}</ul></div> : null}
              {result.errors?.length ? <div><p className="text-xs font-medium text-destructive">Pendências</p><ul className="mt-2 space-y-1 text-sm text-destructive">{result.errors.map((item, index) => <li key={index}>• {typeof item === "string" ? item : JSON.stringify(item)}</li>)}</ul></div> : null}
              {(result.nfseXml || result.xml || result.response) && <pre className="max-h-[520px] overflow-auto rounded-md bg-muted/50 p-4 text-[11px] leading-5 text-foreground">{result.nfseXml || result.xml || JSON.stringify(result.response, null, 2)}</pre>}
            </div> : <p className="mt-4 text-sm text-muted-foreground">Comece lendo o certificado.</p>}
          </section>
        </div>
      </div>
    </div>}
  </main></AdminLayout>;
}

function FieldLabel({ children }: { children: React.ReactNode }) { return <label className="mb-2 block text-xs font-medium text-muted-foreground">{children}</label>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><FieldLabel>{label}</FieldLabel>{children}</div>; }
function MiniStatus({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-border bg-background px-4 py-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 break-all text-sm font-medium">{value}</p></div>; }
function Badge({ ok, children }: { ok: boolean; children: React.ReactNode }) { return <span className={`rounded-full px-2.5 py-1 ${ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-destructive/10 text-destructive"}`}>{children}</span>; }
function ErrorText({ children }: { children: React.ReactNode }) { return <p className="flex gap-2 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>{children}</p>; }
