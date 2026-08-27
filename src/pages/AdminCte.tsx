import { FormEvent, useState } from "react";
import { FileKey2, KeyRound, LockKeyhole } from "lucide-react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { CteIssuerPanel } from "@/components/admin/fiscal/CteIssuerPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

async function invoke<T>(name:string, body:Record<string,unknown>):Promise<T>{
  const {data,error}=await supabase.functions.invoke(name,{body});
  if(!error)return data as T;
  let message=error.message;
  try{const context=(error as {context?:Response}).context;if(context){const payload=await context.clone().json();message=payload?.error||message;}}catch{/* noop */}
  throw new Error(message);
}
async function fileToBase64(file:File){const bytes=new Uint8Array(await file.arrayBuffer());let binary="";for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(binary);}

export default function AdminCte(){
  const [token,setToken]=useState("");
  const [unlockPassword,setUnlockPassword]=useState("");
  const [certificateBase64,setCertificateBase64]=useState("");
  const [certificatePassword,setCertificatePassword]=useState("");
  const [certificateName,setCertificateName]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const authenticate=async(e:FormEvent)=>{e.preventDefault();setLoading(true);setError("");try{const data=await invoke<{token:string}>("accounting-engine",{action:"unlock",password:unlockPassword});setToken(data.token);setUnlockPassword("");}catch(x){setError(x instanceof Error?x.message:"Falha ao desbloquear.");}finally{setLoading(false);}};
  const chooseCertificate=async(file?:File)=>{setError("");if(!file){setCertificateBase64("");setCertificateName("");return;}setCertificateName(file.name);try{setCertificateBase64(await fileToBase64(file));}catch{setError("Não foi possível ler o certificado.");}};
  const lock=()=>{setToken("");setCertificateBase64("");setCertificatePassword("");setCertificateName("");setError("");};
  return <AdminLayout><main className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 sm:py-6">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Emissor fiscal</p><h1 className="mt-1 text-3xl font-semibold">CT-e</h1><p className="mt-1 text-sm text-muted-foreground">Modelo 57 · CT-e 4.00 · SVRS · homologação</p></div>{token&&<Button variant="ghost" onClick={lock}><LockKeyhole className="mr-2 h-4 w-4"/>Bloquear</Button>}</header>
    {!token?<section className="mx-auto mt-16 max-w-md rounded-lg border bg-background p-8"><KeyRound className="mb-5 h-6 w-6"/><h2 className="text-xl font-semibold">Desbloquear CT-e</h2><p className="mt-2 text-sm text-muted-foreground">Use a mesma senha da Engine fiscal.</p><form onSubmit={authenticate} className="mt-6 space-y-4"><Input type="password" value={unlockPassword} onChange={e=>setUnlockPassword(e.target.value)} placeholder="Senha" required/>{error&&<p className="text-sm text-destructive">{error}</p>}<Button className="w-full" disabled={loading}>{loading?"Verificando...":"Entrar"}</Button></form></section>:<div className="mt-7 space-y-6">
      <section className="rounded-lg border bg-background p-5"><div className="mb-4"><p className="text-xs uppercase text-muted-foreground">Credencial</p><h2 className="mt-1 text-lg font-semibold">Certificado A1</h2></div><div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(220px,300px)]"><label><span className="mb-1.5 block text-xs text-muted-foreground">Arquivo .pfx/.p12</span><Input type="file" accept=".pfx,.p12,application/x-pkcs12" onChange={e=>chooseCertificate(e.target.files?.[0])}/>{certificateName&&<span className="mt-1 block break-all text-xs text-muted-foreground"><FileKey2 className="mr-1 inline h-3 w-3"/>{certificateName}</span>}</label><label><span className="mb-1.5 block text-xs text-muted-foreground">Senha do A1</span><Input type="password" value={certificatePassword} onChange={e=>setCertificatePassword(e.target.value)}/></label></div><p className="mt-3 text-xs text-muted-foreground">A senha começa vazia e não é gravada neste código.</p></section>
      {error&&<p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      <CteIssuerPanel token={token} certificateBase64={certificateBase64} certificatePassword={certificatePassword}/>
    </div>}
  </main></AdminLayout>;
}
