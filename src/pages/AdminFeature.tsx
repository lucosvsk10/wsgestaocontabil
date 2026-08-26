import { FormEvent, useState } from "react";
import { AlertTriangle, FileKey2, KeyRound, LockKeyhole, RefreshCw, Send } from "lucide-react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type Mode = "nfce" | "nfe" | "nfse";
type CertificateInfo = { cnpj?: string | null; cpf?: string | null; nome?: string | null; validadeFim?: string; validoAgora?: boolean };
type Result = { ok?: boolean; connected?: boolean; valid?: boolean; errors?: unknown[]; warnings?: string[]; certificate?: CertificateInfo; response?: unknown; xml?: string; chaveAcesso?: string; [key: string]: unknown };

const serviceInitial = {
  cnpjPrestador: "", municipioEmissor: "2704401", simples: "3", cnpjTomador: "", cpfTomador: "", nomeTomador: "",
  municipioPrestacao: "2704401", codigoTributacao: "", descricao: "", valor: "", tributacaoIss: "1", serie: "1", numero: "1",
};

const saleInitial = {
  cnpjEmitente: "64038361000100",
  razaoSocial: "A G MATOS PORTUGUES COMERCIO",
  nomeFantasia: "PORTUGUES",
  ie: "241696534",
  crt: "1",
  codigoMunicipio: "2704401",
  nomeMunicipio: "Major Isidoro",
  logradouro: "Avenida Deputado Antonio Guedes do Amaral",
  numeroEndereco: "282",
  complemento: "",
  bairro: "Centro",
  cep: "57580000",
  telefone: "82999324884",
  cscId: "",
  csc: "",
  serie: "1",
  numeroNota: "1",
  codigoProduto: "1",
  produto: "PRODUTO PARA TESTE EM HOMOLOGACAO",
  ncm: "21069090",
  cfop: "5102",
  unidade: "UN",
  quantidade: "1",
  valorUnitario: "10.00",
  origem: "0",
  csosn: "400",
  cst: "00",
  formaPagamento: "17",
  destDocumento: "",
  destNome: "",
  destLogradouro: "",
  destNumero: "",
  destBairro: "",
  destCodigoMunicipio: "2704401",
  destMunicipio: "Major Isidoro",
  destUF: "AL",
  destCep: "",
};

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (!error) return data as T;
  let message = error.message;
  try {
    const context = (error as { context?: Response }).context;
    if (context) {
      const payload = await context.clone().json();
      const details = Array.isArray(payload?.errors) ? payload.errors.map((x: unknown) => typeof x === "string" ? x : JSON.stringify(x)).join(" · ") : "";
      message = [payload?.error || message, details].filter(Boolean).join(" — ");
    }
  } catch { /* noop */ }
  throw new Error(message);
}

async function fileToBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer()); let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export default function AdminFeature() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>("nfce");
  const [certificateBase64, setCertificateBase64] = useState("");
  const [certificatePassword, setCertificatePassword] = useState("");
  const [certificateName, setCertificateName] = useState("");
  const [certificate, setCertificate] = useState<CertificateInfo | null>(null);
  const [service, setService] = useState(serviceInitial);
  const [sale, setSale] = useState(saleInitial);
  const [reference, setReference] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [action, setAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const hasCert = Boolean(certificateBase64 && certificatePassword);

  const authenticate = async (e: FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const data = await invoke<{token:string}>("accounting-engine", { action: "unlock", password });
      setToken(data.token); setPassword("");
    } catch (x) { setError(x instanceof Error ? x.message : "Falha ao desbloquear."); }
    finally { setLoading(false); }
  };

  const chooseCertificate = async (file?: File) => {
    setCertificate(null); setResult(null); setError("");
    if (!file) { setCertificateBase64(""); setCertificateName(""); return; }
    setCertificateName(file.name);
    try { setCertificateBase64(await fileToBase64(file)); }
    catch { setError("Não foi possível ler o certificado."); }
  };

  const inspectCertificate = async () => {
    setAction("certificate"); setError("");
    try {
      const data = await invoke<Result>("nfse-feature", {
        action: "inspect_certificate", engine_token: token, environment: "homologacao",
        certificate_base64: certificateBase64, certificate_password: certificatePassword, data: service,
      });
      setCertificate(data.certificate || null);
      if (data.certificate?.cnpj) {
        setService(s => ({ ...s, cnpjPrestador: data.certificate!.cnpj! }));
        setSale(s => ({ ...s, cnpjEmitente: data.certificate!.cnpj! }));
      }
      setResult(data);
    } catch (x) { setError(x instanceof Error ? x.message : "Falha no certificado."); }
    finally { setAction(null); }
  };

  const request = async (kind: "validate" | "test_connection" | "preview" | "issue" | "query") => {
    setAction(kind); setError(""); setResult(null);
    try {
      const common = { action: kind, engine_token: token, environment: "homologacao", certificate_base64: certificateBase64, certificate_password: certificatePassword };
      const data = mode === "nfse"
        ? await invoke<Result>("nfse-feature", { ...common, data: service, ...(kind === "query" ? { reference } : {}) })
        : await invoke<Result>("dfe-feature", { ...common, model: mode === "nfce" ? "65" : "55", data: sale, ...(kind === "query" ? { reference } : {}) });
      setResult(data);
      if (data.certificate) setCertificate(data.certificate);
      if (data.chaveAcesso) setReference(String(data.chaveAcesso));
    } catch (x) { setError(x instanceof Error ? x.message : "Falha no teste fiscal."); }
    finally { setAction(null); }
  };

  const switchMode = (next: Mode) => { setMode(next); setResult(null); setError(""); setReference(""); };
  const lock = () => { setToken(""); setCertificateBase64(""); setCertificatePassword(""); setCertificateName(""); setCertificate(null); setResult(null); setError(""); };

  return <AdminLayout><main className="mx-auto w-full max-w-[1500px] px-6 py-6">
    <header className="flex items-end justify-between gap-4 border-b border-border pb-5">
      <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Laboratório fiscal</p><div className="mt-1 flex items-center gap-3"><h1 className="text-3xl font-semibold">Feature</h1><span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase text-muted-foreground">Homologação</span></div></div>
      {token && <Button variant="ghost" onClick={lock}><LockKeyhole className="mr-2 h-4 w-4"/>Bloquear</Button>}
    </header>

    {!token ? <section className="mx-auto mt-16 max-w-md rounded-lg border bg-background p-8">
      <KeyRound className="mb-5 h-6 w-6"/><h2 className="text-xl font-semibold">Desbloquear Feature</h2><p className="mt-2 text-sm text-muted-foreground">Mesma senha da Engine.</p>
      <form onSubmit={authenticate} className="mt-6 space-y-4"><Input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Senha" required/>{error && <ErrorText>{error}</ErrorText>}<Button className="w-full" disabled={loading}>{loading ? "Verificando..." : "Entrar"}</Button></form>
    </section> : <div className="mt-7 space-y-6">
      <section className="flex flex-wrap gap-2">{([['nfce','NFC-e · Venda consumidor'],['nfe','NF-e · Venda mercadoria'],['nfse','NFS-e · Serviço']] as [Mode,string][]).map(([id,label])=><button key={id} onClick={()=>switchMode(id)} className={`rounded-md border px-4 py-2 text-sm font-medium ${mode===id?'bg-foreground text-background':'bg-background hover:bg-muted'}`}>{label}</button>)}</section>
      <section className="grid gap-3 md:grid-cols-3"><Mini label="Ambiente" value="Homologação"/><Mini label="Destino" value={mode==='nfse'?'SEFIN Nacional':'SEFAZ / SVRS'}/><Mini label="Custo por nota" value="R$ 0,00"/></section>

      <section className="rounded-lg border bg-background p-5">
        <div className="mb-4"><p className="text-xs uppercase text-muted-foreground">Credencial</p><h2 className="mt-1 text-lg font-semibold">Certificado A1</h2></div>
        <div className="grid gap-4 lg:grid-cols-[1fr_300px_auto] lg:items-end">
          <Field label="Arquivo .pfx/.p12"><Input type="file" accept=".pfx,.p12,application/x-pkcs12" onChange={e=>chooseCertificate(e.target.files?.[0])}/>{certificateName&&<p className="mt-1 text-xs text-muted-foreground">{certificateName}</p>}</Field>
          <Field label="Senha"><Input type="password" value={certificatePassword} onChange={e=>setCertificatePassword(e.target.value)}/></Field>
          <Button variant="outline" onClick={inspectCertificate} disabled={!hasCert||!!action}>{action==='certificate'?<RefreshCw className="mr-2 h-4 w-4 animate-spin"/>:<FileKey2 className="mr-2 h-4 w-4"/>}Ler certificado</Button>
        </div>
        {certificate&&<div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-3"><Info label="Titular" value={certificate.nome||'—'}/><Info label="CNPJ" value={certificate.cnpj||certificate.cpf||'—'}/><Info label="Validade" value={certificate.validadeFim?new Date(certificate.validadeFim).toLocaleDateString('pt-BR'):'—'}/></div>}
        <p className="mt-3 text-xs text-muted-foreground">Certificado, senha e CSC não são salvos.</p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <section className="rounded-lg border bg-background p-5">
          {mode==='nfse'?<ServiceForm data={service} setData={setService}/>:<SaleForm mode={mode} data={sale} setData={setSale}/>} 
          <div className="mt-5 flex flex-wrap gap-3 border-t pt-5">
            <Button variant="outline" onClick={()=>request('validate')} disabled={!!action}>Validar</Button>
            <Button variant="outline" onClick={()=>request('test_connection')} disabled={!hasCert||!!action}>{action==='test_connection'&&<RefreshCw className="mr-2 h-4 w-4 animate-spin"/>}Testar governo</Button>
            <Button variant="outline" onClick={()=>request('preview')} disabled={!hasCert||!!action}>Gerar XML</Button>
            <Button onClick={()=>request('issue')} disabled={!hasCert||!!action}>{action==='issue'?<RefreshCw className="mr-2 h-4 w-4 animate-spin"/>:<Send className="mr-2 h-4 w-4"/>}Emitir teste</Button>
          </div>
        </section>
        <div className="space-y-6">
          <section className="rounded-lg border bg-background p-5"><p className="text-xs uppercase text-muted-foreground">Consulta</p><div className="mt-3 flex gap-2"><Input value={reference} onChange={e=>setReference(e.target.value)} placeholder={mode==='nfse'?'Chave / referência':'Chave de acesso · 44 dígitos'}/><Button variant="outline" onClick={()=>request('query')} disabled={!reference||!hasCert||!!action}>Consultar</Button></div></section>
          <section className="rounded-lg border bg-background p-5"><p className="text-xs uppercase text-muted-foreground">Retorno</p>{error?<ErrorText>{error}</ErrorText>:result?<ResultBox result={result}/>:<p className="mt-4 text-sm text-muted-foreground">O retorno da Receita/SEFAZ aparece aqui.</p>}</section>
        </div>
      </div>
    </div>}
  </main></AdminLayout>;
}

function SaleForm({mode,data,setData}:{mode:Mode;data:typeof saleInitial;setData:React.Dispatch<React.SetStateAction<typeof saleInitial>>}) {
  const u=(k:keyof typeof saleInitial,v:string)=>setData(s=>({...s,[k]:v}));
  return <>
    <div className="mb-5"><p className="text-xs uppercase text-muted-foreground">{mode==='nfce'?'Modelo 65':'Modelo 55'}</p><h2 className="mt-1 text-lg font-semibold">Venda de mercadoria</h2></div>
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="CNPJ emitente"><Input value={data.cnpjEmitente} onChange={e=>u('cnpjEmitente',e.target.value)}/></Field>
      <Field label="Inscrição estadual"><Input value={data.ie} onChange={e=>u('ie',e.target.value)} placeholder="CACEAL / IE"/></Field>
      <Field label="Razão social"><Input value={data.razaoSocial} onChange={e=>u('razaoSocial',e.target.value)}/></Field>
      <Field label="CRT"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={data.crt} onChange={e=>u('crt',e.target.value)}><option value="1">1 · Simples Nacional</option><option value="3">3 · Regime normal</option></select></Field>
      <Field label="Município IBGE"><Input value={data.codigoMunicipio} onChange={e=>u('codigoMunicipio',e.target.value)}/></Field>
      <Field label="Município"><Input value={data.nomeMunicipio} onChange={e=>u('nomeMunicipio',e.target.value)}/></Field>
      <Field label="Logradouro"><Input value={data.logradouro} onChange={e=>u('logradouro',e.target.value)}/></Field>
      <Field label="Número"><Input value={data.numeroEndereco} onChange={e=>u('numeroEndereco',e.target.value)}/></Field>
      <Field label="Bairro"><Input value={data.bairro} onChange={e=>u('bairro',e.target.value)}/></Field>
      <Field label="CEP"><Input value={data.cep} onChange={e=>u('cep',e.target.value)}/></Field>
      {mode==='nfce'&&<><Field label="ID CSC · Homologação"><Input value={data.cscId} onChange={e=>u('cscId',e.target.value)} placeholder="Seu CSC enviado é de produção"/></Field><Field label="CSC · Homologação"><Input type="password" value={data.csc} onChange={e=>u('csc',e.target.value)} placeholder="Gerar na SEFAZ em Homologação"/></Field></>}
      <Field label="Número da nota"><Input value={data.numeroNota} onChange={e=>u('numeroNota',e.target.value)}/></Field>
      <Field label="Série"><Input value={data.serie} onChange={e=>u('serie',e.target.value)}/></Field>
      <div className="md:col-span-2 border-t pt-4"><p className="text-sm font-medium">Item de homologação</p><p className="mt-1 text-xs text-muted-foreground">Dados de exemplo apenas para testar o fluxo; troque pelo produto real antes de qualquer uso fora da homologação.</p></div>
      <Field label="Produto"><Input value={data.produto} onChange={e=>u('produto',e.target.value)}/></Field>
      <Field label="NCM"><Input value={data.ncm} onChange={e=>u('ncm',e.target.value)} placeholder="8 dígitos"/></Field>
      <Field label="CFOP"><Input value={data.cfop} onChange={e=>u('cfop',e.target.value)}/></Field>
      <Field label={data.crt==='1'?'CSOSN':'CST ICMS'}><Input value={data.crt==='1'?data.csosn:data.cst} onChange={e=>u(data.crt==='1'?'csosn':'cst',e.target.value)}/></Field>
      <Field label="Quantidade"><Input type="number" step="0.0001" value={data.quantidade} onChange={e=>u('quantidade',e.target.value)}/></Field>
      <Field label="Valor unitário"><Input type="number" step="0.01" value={data.valorUnitario} onChange={e=>u('valorUnitario',e.target.value)}/></Field>
      {mode==='nfe'&&<><Field label="CPF/CNPJ destinatário"><Input value={data.destDocumento} onChange={e=>u('destDocumento',e.target.value)}/></Field><Field label="Nome destinatário"><Input value={data.destNome} onChange={e=>u('destNome',e.target.value)}/></Field></>}
    </div>
  </>;
}

function ServiceForm({data,setData}:{data:typeof serviceInitial;setData:React.Dispatch<React.SetStateAction<typeof serviceInitial>>}) {
  const u=(k:keyof typeof serviceInitial,v:string)=>setData(s=>({...s,[k]:v}));
  return <><div className="mb-5"><p className="text-xs uppercase text-muted-foreground">NFS-e Nacional</p><h2 className="mt-1 text-lg font-semibold">Prestação de serviço</h2></div><div className="grid gap-4 md:grid-cols-2"><Field label="CNPJ prestador"><Input value={data.cnpjPrestador} onChange={e=>u('cnpjPrestador',e.target.value)}/></Field><Field label="Município IBGE"><Input value={data.municipioEmissor} onChange={e=>u('municipioEmissor',e.target.value)}/></Field><Field label="Código tributação nacional"><Input value={data.codigoTributacao} onChange={e=>u('codigoTributacao',e.target.value)}/></Field><Field label="Valor"><Input type="number" step="0.01" value={data.valor} onChange={e=>u('valor',e.target.value)}/></Field><div className="md:col-span-2"><Field label="Descrição"><Input value={data.descricao} onChange={e=>u('descricao',e.target.value)}/></Field></div></div></>;
}

function Field({label,children}:{label:string;children:React.ReactNode}) { return <div><label className="mb-2 block text-xs font-medium text-muted-foreground">{label}</label>{children}</div>; }
function Mini({label,value}:{label:string;value:string}) { return <div className="rounded-lg border bg-background px-4 py-3"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>; }
function Info({label,value}:{label:string;value:string}) { return <div><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>; }
function ErrorText({children}:{children:React.ReactNode}) { return <p className="mt-4 flex gap-2 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>{children}</p>; }
function ResultBox({result}:{result:Result}) { return <div className="mt-4 space-y-3">{result.connected&&<p className="text-sm font-medium">Conexão com o governo confirmada.</p>}{result.warnings?.length?<div><p className="text-xs font-medium">Avisos</p>{result.warnings.map((x,i)=><p key={i} className="mt-1 text-xs text-muted-foreground">• {x}</p>)}</div>:null}<pre className="max-h-[520px] overflow-auto rounded-md bg-muted/50 p-4 text-[11px] leading-5">{JSON.stringify(result.response ?? result, null, 2)}</pre></div>; }
