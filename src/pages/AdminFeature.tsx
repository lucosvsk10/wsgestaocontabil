import { FormEvent, useEffect, useState } from "react";
import { AlertTriangle, KeyRound, LockKeyhole, RefreshCw, Send } from "lucide-react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { AuthorizedNfceCard } from "@/components/admin/fiscal/AuthorizedNfceCard";
import { CteIssuerPanel } from "@/components/admin/fiscal/CteIssuerPanel";
import { FiscalExtractorPanel } from "@/components/admin/fiscal/FiscalExtractorPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useCompanySelection } from "@/contexts/CompanySelectionContext";

type Section = "emissor" | "extrator";
type Mode = "nfce" | "nfe" | "nfse" | "cte";
type CertificateInfo = { cnpj?: string | null; cpf?: string | null; nome?: string | null; validadeFim?: string; validoAgora?: boolean };
type Result = { ok?: boolean; authorized?: boolean; connected?: boolean; valid?: boolean; errors?: unknown[]; warnings?: string[]; certificate?: CertificateInfo; response?: any; xml?: string; chaveAcesso?: string; [key: string]: unknown };

const serviceInitial = { cnpjPrestador: "", municipioEmissor: "2704401", simples: "3", cnpjTomador: "", cpfTomador: "", nomeTomador: "", municipioPrestacao: "2704401", codigoTributacao: "", descricao: "", valor: "", tributacaoIss: "1", serie: "1", numero: "1" };
const saleInitial = {
  cnpjEmitente: "64038361000100", razaoSocial: "A G MATOS PORTUGUES COMERCIO", nomeFantasia: "PORTUGUES", ie: "241696534", crt: "1",
  codigoMunicipio: "2704401", nomeMunicipio: "Major Isidoro", logradouro: "Avenida Deputado Antonio Guedes do Amaral", numeroEndereco: "282", complemento: "", bairro: "Centro", cep: "57580000", telefone: "82999324884",
  cscId: "", csc: "", serie: "1", numeroNota: "1", codigoProduto: "1", produto: "PRODUTO PARA TESTE EM HOMOLOGACAO", ncm: "21069090", cfop: "5102", unidade: "UN", quantidade: "1", valorUnitario: "10.00", origem: "0", csosn: "400", cst: "00", formaPagamento: "01",
  destDocumento: "", destNome: "", destLogradouro: "", destNumero: "", destBairro: "", destCodigoMunicipio: "2704401", destMunicipio: "Major Isidoro", destUF: "AL", destCep: ""
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
  const { selectedCompany } = useCompanySelection();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [section, setSection] = useState<Section>("emissor");
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
  const [extractorPassword, setExtractorPassword] = useState("");
  const [extractorUnlocked, setExtractorUnlocked] = useState(false);
  const [extractorLoading, setExtractorLoading] = useState(false);
  const [extractorError, setExtractorError] = useState("");
  const hasCert = Boolean(certificateBase64 && certificatePassword);

  useEffect(() => {
    if (!selectedCompany) return;
    const cnpj = String(selectedCompany.cnpj || "").replace(/\D/g, "");
    setSale(current => ({ ...current, cnpjEmitente: cnpj, razaoSocial: selectedCompany.company_name, nomeFantasia: selectedCompany.trade_name || selectedCompany.company_name }));
    setService(current => ({ ...current, cnpjPrestador: cnpj }));
  }, [selectedCompany?.id]);


  const authenticate = async (e: FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try { const data = await invoke<{token:string}>("accounting-engine", { action: "unlock", password }); setToken(data.token); setPassword(""); }
    catch (x) { setError(x instanceof Error ? x.message : "Falha ao desbloquear."); }
    finally { setLoading(false); }
  };
  const unlockExtractor = async (e: FormEvent) => {
    e.preventDefault(); setExtractorLoading(true); setExtractorError("");
    try {
      await invoke<{token:string}>("accounting-engine", { action: "unlock", password: extractorPassword });
      setExtractorUnlocked(true);
      setExtractorPassword("");
    } catch (x) { setExtractorError(x instanceof Error ? x.message : "Senha incorreta."); }
    finally { setExtractorLoading(false); }
  };
  const chooseCertificate = async (file?: File) => {
    setCertificate(null); setResult(null); setError("");
    if (!file) { setCertificateBase64(""); setCertificateName(""); return; }
    setCertificateName(file.name);
    try { setCertificateBase64(await fileToBase64(file)); } catch { setError("Não foi possível ler o certificado."); }
  };
  const request = async (kind: "validate" | "test_connection" | "preview" | "issue" | "query") => {
    setAction(kind); setError(""); setResult(null);
    try {
      const common = { action: kind, engine_token: token, environment: "homologacao", certificate_base64: certificateBase64, certificate_password: certificatePassword };
      const data = mode === "nfse"
        ? await invoke<Result>("nfse-feature", { ...common, data: service, ...(kind === "query" ? { reference } : {}) })
        : kind === "preview" ? await invoke<Result>("dfe-preview-native", { ...common, model: mode === "nfce" ? "65" : "55", data: sale })
        : kind === "issue" ? await invoke<Result>("dfe-issue-native", { ...common, model: mode === "nfce" ? "65" : "55", data: sale })
        : await invoke<Result>("dfe-feature", { ...common, model: mode === "nfce" ? "65" : "55", data: sale, ...(kind === "query" ? { reference } : {}) });
      setResult(data); if (data.certificate) setCertificate(data.certificate); if (data.chaveAcesso) setReference(String(data.chaveAcesso));
    } catch (x) { setError(x instanceof Error ? x.message : "Falha no teste fiscal."); }
    finally { setAction(null); }
  };
  const lock = () => { setToken(""); setCertificateBase64(""); setCertificatePassword(""); setCertificateName(""); setCertificate(null); setResult(null); setError(""); setSection("emissor"); setMode("nfce"); setExtractorUnlocked(false); setExtractorPassword(""); setExtractorError(""); };

  return <AdminLayout><main className="mx-auto min-w-0 w-full max-w-[1500px] overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div className="min-w-0"><p className="text-xs uppercase tracking-wider text-muted-foreground">Laboratório fiscal</p><div className="mt-1 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-semibold">Feature</h1><span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase text-muted-foreground">Fiscal direto</span></div></div>
      {token && <Button variant="ghost" onClick={lock}><LockKeyhole className="mr-2 h-4 w-4"/>Bloquear</Button>}
    </header>

    {!token ? <section className="mx-auto mt-16 max-w-md rounded-lg border bg-background p-8">
      <KeyRound className="mb-5 h-6 w-6"/><h2 className="text-xl font-semibold">Desbloquear Feature</h2><p className="mt-2 text-sm text-muted-foreground">Mesma senha da Engine.</p>
      <form onSubmit={authenticate} className="mt-6 space-y-4"><Input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Senha" required/>{error && <ErrorText>{error}</ErrorText>}<Button className="w-full" disabled={loading}>{loading ? "Verificando..." : "Entrar"}</Button></form>
    </section> : <div className="mt-7 min-w-0 space-y-6">
      <nav className="inline-flex rounded-lg border bg-muted/30 p-1">
        <button onClick={()=>{setSection("emissor");setError("");}} className={`rounded-md px-5 py-2.5 text-sm font-medium transition ${section==="emissor"?"bg-background shadow-sm":"text-muted-foreground hover:text-foreground"}`}>Emissor fiscal</button>
        <button onClick={()=>{setSection("extrator");setError("");setExtractorError("");}} className={`rounded-md px-5 py-2.5 text-sm font-medium transition ${section==="extrator"?"bg-background shadow-sm":"text-muted-foreground hover:text-foreground"}`}>Extrator de notas</button>
      </nav>

      {section === "extrator" && !extractorUnlocked ? <section className="mx-auto mt-10 max-w-md rounded-lg border bg-background p-8">
        <LockKeyhole className="mb-5 h-6 w-6"/><h2 className="text-xl font-semibold">Extrator protegido</h2><p className="mt-2 text-sm text-muted-foreground">Confirme a senha da Feature para acessar certificados e consultas do extrator.</p>
        <form onSubmit={unlockExtractor} className="mt-6 space-y-4"><Input type="password" value={extractorPassword} onChange={e=>setExtractorPassword(e.target.value)} placeholder="Senha" autoFocus required/>{extractorError && <ErrorText>{extractorError}</ErrorText>}<Button className="w-full" disabled={extractorLoading}>{extractorLoading ? "Verificando..." : "Desbloquear extrator"}</Button></form>
      </section> : <>
        {(section === "extrator" || mode !== "cte") && <section className="min-w-0 rounded-lg border bg-background p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase text-muted-foreground">Credencial compartilhada</p><h2 className="mt-1 text-lg font-semibold">Certificado A1</h2></div>{section === "extrator" && <Button variant="ghost" size="sm" onClick={()=>{setExtractorUnlocked(false);setExtractorPassword("");}}><LockKeyhole className="mr-2 h-4 w-4"/>Bloquear extrator</Button>}</div>
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            <Field label="Arquivo .pfx/.p12"><Input className="min-w-0" type="file" accept=".pfx,.p12,application/x-pkcs12" onChange={e=>chooseCertificate(e.target.files?.[0])}/>{certificateName&&<p className="mt-1 break-all text-xs text-muted-foreground">{certificateName}</p>}</Field>
            <Field label="Senha"><Input type="password" value={certificatePassword} onChange={e=>setCertificatePassword(e.target.value)}/></Field>
          </div>
          {certificate&&<div className="mt-4 grid min-w-0 gap-3 border-t pt-4 sm:grid-cols-3"><Info label="Titular" value={certificate.nome||'—'}/><Info label="CNPJ" value={certificate.cnpj||certificate.cpf||'—'}/><Info label="Validade" value={certificate.validadeFim?new Date(certificate.validadeFim).toLocaleDateString('pt-BR'):'—'}/></div>}
          <p className="mt-3 text-xs text-muted-foreground">No CT-e o A1 padrão de teste é carregado automaticamente do backend.</p>
        </section>}

        {section === "extrator" ? <FiscalExtractorPanel token={token} certificateBase64={certificateBase64} certificatePassword={certificatePassword} certificate={certificate} /> : <>
          <section className="flex flex-wrap gap-2">{([['nfce','NFC-e · Venda consumidor'],['nfe','NF-e · Venda mercadoria'],['nfse','NFS-e · Serviço'],['cte','CT-e · Transporte']] as [Mode,string][]).map(([id,label])=><button key={id} onClick={()=>{setMode(id);setResult(null);setError("");setReference("");}} className={`rounded-md border px-4 py-2 text-sm font-medium ${mode===id?'bg-foreground text-background':'bg-background hover:bg-muted'}`}>{label}</button>)}</section>
          <section className="grid min-w-0 gap-3 md:grid-cols-3"><Mini label="Ambiente" value="Homologação"/><Mini label="Destino" value={mode==='nfse'?'SEFIN Nacional':'SEFAZ / SVRS'}/><Mini label="Custo por documento" value="R$ 0,00"/></section>
          {mode === "cte" ? <CteIssuerPanel token={token} /> : <div className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(460px,.9fr)_minmax(0,1.35fr)]">
            <section className="min-w-0 rounded-lg border bg-background p-4 sm:p-5">
              {mode==='nfse'?<ServiceForm data={service} setData={setService}/>:<SaleForm mode={mode} data={sale} setData={setSale}/>} 
              <div className="mt-5 flex flex-wrap gap-3 border-t pt-5"><Button variant="outline" onClick={()=>request('validate')} disabled={!!action}>Validar</Button><Button variant="outline" onClick={()=>request('test_connection')} disabled={!hasCert||!!action}>{action==='test_connection'&&<RefreshCw className="mr-2 h-4 w-4 animate-spin"/>}Testar governo</Button><Button variant="outline" onClick={()=>request('preview')} disabled={!hasCert||!!action}>Gerar XML</Button><Button onClick={()=>request('issue')} disabled={!hasCert||!!action}>{action==='issue'?<RefreshCw className="mr-2 h-4 w-4 animate-spin"/>:<Send className="mr-2 h-4 w-4"/>}Emitir teste</Button></div>
            </section>
            <div className="min-w-0 space-y-6">
              <section className="min-w-0 rounded-lg border bg-background p-4 sm:p-5"><p className="text-xs uppercase text-muted-foreground">Consulta</p><div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row"><Input className="min-w-0" value={reference} onChange={e=>setReference(e.target.value)} placeholder={mode==='nfse'?'Chave / referência':'Chave de acesso · 44 dígitos'}/><Button className="sm:shrink-0" variant="outline" onClick={()=>request('query')} disabled={!reference||!hasCert||!!action}>Consultar</Button></div></section>
              <section className="min-w-0 rounded-lg border bg-background p-4 sm:p-5"><p className="text-xs uppercase text-muted-foreground">Retorno</p>{mode==='nfce'&&result?.authorized?<AuthorizedNfceCard token={token} sale={sale} result={result}/>:null}{error?<ErrorText>{error}</ErrorText>:result?<ResultBox result={result}/>:<p className="mt-4 text-sm text-muted-foreground">O retorno da Receita/SEFAZ aparece aqui.</p>}</section>
            </div>
          </div>}
        </>}
      </>}
    </div>}
  </main></AdminLayout>;
}

function SaleForm({mode,data,setData}:{mode:Mode;data:typeof saleInitial;setData:React.Dispatch<React.SetStateAction<typeof saleInitial>>}) {
  const u=(k:keyof typeof saleInitial,v:string)=>setData(s=>({...s,[k]:v}));
  return <><div className="mb-5"><p className="text-xs uppercase text-muted-foreground">{mode==='nfce'?'Modelo 65':'Modelo 55'}</p><h2 className="mt-1 text-lg font-semibold">Venda de mercadoria</h2></div><div className="grid min-w-0 gap-4 md:grid-cols-2">
    <Field label="CNPJ emitente"><Input value={data.cnpjEmitente} onChange={e=>u('cnpjEmitente',e.target.value)}/></Field><Field label="Inscrição estadual"><Input value={data.ie} onChange={e=>u('ie',e.target.value)} placeholder="CACEAL / IE"/></Field><Field label="Razão social"><Input value={data.razaoSocial} onChange={e=>u('razaoSocial',e.target.value)}/></Field><Field label="CRT"><select className="h-10 min-w-0 w-full rounded-md border bg-background px-3 text-sm" value={data.crt} onChange={e=>u('crt',e.target.value)}><option value="1">1 · Simples Nacional</option><option value="3">3 · Regime normal</option></select></Field>
    <Field label="Município IBGE"><Input value={data.codigoMunicipio} onChange={e=>u('codigoMunicipio',e.target.value)}/></Field><Field label="Município"><Input value={data.nomeMunicipio} onChange={e=>u('nomeMunicipio',e.target.value)}/></Field><Field label="Logradouro"><Input value={data.logradouro} onChange={e=>u('logradouro',e.target.value)}/></Field><Field label="Número"><Input value={data.numeroEndereco} onChange={e=>u('numeroEndereco',e.target.value)}/></Field><Field label="Bairro"><Input value={data.bairro} onChange={e=>u('bairro',e.target.value)}/></Field><Field label="CEP"><Input value={data.cep} onChange={e=>u('cep',e.target.value)}/></Field><Field label="Número da nota"><Input value={data.numeroNota} onChange={e=>u('numeroNota',e.target.value)}/></Field><Field label="Série"><Input value={data.serie} onChange={e=>u('serie',e.target.value)}/></Field>
    <div className="border-t pt-4 md:col-span-2"><p className="text-sm font-medium">Item de homologação</p></div><Field label="Produto"><Input value={data.produto} onChange={e=>u('produto',e.target.value)}/></Field><Field label="NCM"><Input value={data.ncm} onChange={e=>u('ncm',e.target.value)}/></Field><Field label="CFOP"><Input value={data.cfop} onChange={e=>u('cfop',e.target.value)}/></Field><Field label={data.crt==='1'?'CSOSN':'CST ICMS'}><Input value={data.crt==='1'?data.csosn:data.cst} onChange={e=>u(data.crt==='1'?'csosn':'cst',e.target.value)}/></Field><Field label="Quantidade"><Input type="number" step="0.0001" value={data.quantidade} onChange={e=>u('quantidade',e.target.value)}/></Field><Field label="Valor unitário"><Input type="number" step="0.01" value={data.valorUnitario} onChange={e=>u('valorUnitario',e.target.value)}/></Field>{mode==='nfe'&&<><Field label="CPF/CNPJ destinatário"><Input value={data.destDocumento} onChange={e=>u('destDocumento',e.target.value)}/></Field><Field label="Nome destinatário"><Input value={data.destNome} onChange={e=>u('destNome',e.target.value)}/></Field></>}
  </div></>;
}
function ServiceForm({data,setData}:{data:typeof serviceInitial;setData:React.Dispatch<React.SetStateAction<typeof serviceInitial>>}) { const u=(k:keyof typeof serviceInitial,v:string)=>setData(s=>({...s,[k]:v})); return <><div className="mb-5"><p className="text-xs uppercase text-muted-foreground">NFS-e Nacional</p><h2 className="mt-1 text-lg font-semibold">Prestação de serviço</h2></div><div className="grid min-w-0 gap-4 md:grid-cols-2"><Field label="CNPJ prestador"><Input value={data.cnpjPrestador} onChange={e=>u('cnpjPrestador',e.target.value)}/></Field><Field label="Município IBGE"><Input value={data.municipioEmissor} onChange={e=>u('municipioEmissor',e.target.value)}/></Field><Field label="Código tributação nacional"><Input value={data.codigoTributacao} onChange={e=>u('codigoTributacao',e.target.value)}/></Field><Field label="Valor"><Input type="number" step="0.01" value={data.valor} onChange={e=>u('valor',e.target.value)}/></Field><div className="md:col-span-2"><Field label="Descrição"><Input value={data.descricao} onChange={e=>u('descricao',e.target.value)}/></Field></div></div></>; }
function Field({label,children}:{label:string;children:React.ReactNode}) { return <div className="min-w-0"><label className="mb-2 block text-xs font-medium text-muted-foreground">{label}</label>{children}</div>; }
function Mini({label,value}:{label:string;value:string}) { return <div className="min-w-0 rounded-lg border bg-background px-4 py-3"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-medium" title={value}>{value}</p></div>; }
function Info({label,value}:{label:string;value:string}) { return <div className="min-w-0"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-medium">{value}</p></div>; }
function ErrorText({children}:{children:React.ReactNode}) { return <p className="mt-4 flex min-w-0 gap-2 break-words text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/><span className="min-w-0">{children}</span></p>; }
function ResultBox({result}:{result:Result}) { return <div className="mt-4 min-w-0 space-y-3">{result.connected&&<p className="text-sm font-medium">Conexão com o governo confirmada.</p>}{result.warnings?.length?<div><p className="text-xs font-medium">Avisos</p>{result.warnings.map((x,i)=><p key={i} className="mt-1 break-words text-xs text-muted-foreground">• {x}</p>)}</div>:null}<details className="rounded-md border"><summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground">Detalhes técnicos</summary><pre className="max-h-[520px] max-w-full overflow-auto whitespace-pre-wrap break-all border-t bg-muted/50 p-4 text-[11px] leading-5">{JSON.stringify(result.response ?? result, null, 2)}</pre></details></div>; }
