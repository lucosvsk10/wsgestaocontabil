import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { consume, limited, requestKey } from "../_shared/rate-limit.ts";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,"content-type":"application/json","cache-control":"no-store","x-content-type-options":"nosniff"}});
const E=new TextEncoder(),D=new TextDecoder(),B=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const digits=(v:unknown)=>String(v??"").replace(/\D/g,"");
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const tag=(xml:string,n:string)=>xml.match(new RegExp(`<(?:\\w+:)?${n}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${n}>`,`i`))?.[1]?.trim()||"";
const attr=(s:string,n:string)=>s.match(new RegExp(`${n}=["']([^"']+)["']`,`i`))?.[1]||"";
const UF_CODE:Record<string,string>={AC:"12",AL:"27",AP:"16",AM:"13",BA:"29",CE:"23",DF:"53",ES:"32",GO:"52",MA:"21",MT:"51",MS:"50",MG:"31",PA:"15",PB:"25",PR:"41",PE:"26",PI:"22",RJ:"33",RN:"24",RS:"43",RO:"11",RR:"14",SC:"42",SP:"35",SE:"28",TO:"17"};

async function key(){const s=Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!s)throw new Error("vault_secret_missing");const d=await crypto.subtle.digest("SHA-256",E.encode(`ws-fiscal-vault:${s}`));return crypto.subtle.importKey("raw",d,{name:"AES-GCM"},false,["decrypt"])}
async function dec(c:string,iv:string){return D.decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:B(iv)},await key(),B(c)))}
async function gunzip(v:string){const bytes=Uint8Array.from(atob(v.replace(/\s/g,"")),c=>c.charCodeAt(0));const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));return D.decode(await new Response(stream).arrayBuffer())}
function decodeEntities(v:string){return v.replaceAll("&lt;","<").replaceAll("&gt;",">").replaceAll("&amp;","&").replaceAll("&quot;",'"').replaceAll("&apos;","'")}

function parse(xmlRaw:string,schema:string,nsu:string,companyCnpj:string){
  const xml=decodeEntities(xmlRaw);const isEvent=/procEventoNFe|eventoNFe/i.test(schema)||/<procEventoNFe\b|<evento\b/i.test(xml);const isSummary=/resNFe/i.test(schema);
  const emit=tag(xml,"emit"),dest=tag(xml,"dest");const issuerCnpj=digits(tag(emit,"CNPJ")||(isSummary?tag(xml,"CNPJ"):""));const recipientCnpj=digits(tag(dest,"CNPJ"));
  const accessKey=tag(xml,"chNFe")||xml.match(/Id=["']NFe(\d{44})["']/i)?.[1]||"";const issueDate=tag(xml,"dhEmi")||tag(xml,"dEmi")||tag(xml,"dhEvento")||null;
  const fullXml=!isEvent&&!isSummary&&(/procNFe/i.test(schema)||/<nfeProc\b/i.test(xml));const kind=isEvent?"evento":isSummary?"resumo":fullXml?"nfe":"documento";
  const direction=isEvent?"relacionada":issuerCnpj===companyCnpj?"saida":recipientCnpj===companyCnpj||isSummary?"entrada":"relacionada";
  return {nsu,schema,xml,kind,direction,accessKey,model:accessKey.length===44?accessKey.slice(20,22):null,issueDate,value:Number(tag(xml,"vNF")||0),issuerCnpj,issuerName:tag(emit,"xNome")||(isSummary?tag(xml,"xNome"):""),recipientCnpj,number:tag(xml,"nNF")||null,series:tag(xml,"serie")||null,statusCode:tag(xml,"cSitNFe")||tag(xml,"cStat")||null,fullXml,eventType:isEvent?tag(xml,"tpEvento")||null:null,eventDescription:isEvent?tag(xml,"descEvento")||tag(xml,"xEvento")||null:null};
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response(null,{headers:cors});
  try{
    const auth=req.headers.get("authorization");if(!auth)return json({error:"Não autenticado"},401);
    const url=Deno.env.get("SUPABASE_URL")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;const admin=createClient(url,service);
    const {data:{user}}=await admin.auth.getUser(auth.replace(/^Bearer\s+/i,""));if(!user)return json({error:"Não autenticado"},401);
    const {data:roles}=await admin.from("user_roles").select("role").eq("user_id",user.id);if(!roles?.some((r:any)=>r.role==="admin"))return json({error:"Acesso exclusivo para administradores"},403);
    const limit=await consume(admin,"dfe_extractor",requestKey(req,user.id),6,600);const blocked=limited(limit);if(blocked)return blocked;
    const body=await req.json().catch(()=>({})) as any;const companyId=String(body.company_id||"");if(!companyId)return json({error:"company_id obrigatório"},422);
    const {data:company,error:ce}=await admin.from("fiscal_companies").select("id,cnpj,razao_social,uf,ambiente_padrao,status").eq("id",companyId).single();if(ce||!company)return json({error:"Empresa fiscal não encontrada"},404);if(company.status==="inativa")return json({error:"Empresa fiscal inativa"},422);
    const {data:cert,error:cerror}=await admin.from("fiscal_certificates").select("certificate_ciphertext,certificate_iv,password_ciphertext,password_iv,valid_until").eq("company_id",companyId).eq("is_active",true).order("created_at",{ascending:false}).limit(1).single();if(cerror||!cert)return json({error:"Empresa sem certificado A1 ativo"},422);
    if(cert.valid_until&&new Date(cert.valid_until)<new Date())return json({error:"Certificado expirado"},422);
    const pfx=await dec(cert.certificate_ciphertext,cert.certificate_iv),pass=await dec(cert.password_ciphertext,cert.password_iv),cnpj=digits(company.cnpj),environment=body.environment==="homologacao"||company.ambiente_padrao==="homologacao"?"homologacao":"producao",ufCode=UF_CODE[String(company.uf||"AL").toUpperCase()]||"27";
    const {data:state}=await admin.from("fiscal_dfe_sync_state").select("ult_nsu,max_nsu,last_status_code,last_status_message,last_synced_at").eq("user_id",user.id).eq("cnpj",cnpj).eq("environment",environment).eq("uf_code",ufCode).maybeSingle();
    if(state?.last_status_code==="656"&&state.last_synced_at&&Date.now()-new Date(state.last_synced_at).getTime()<65*60*1000)return json({ok:false,cooldown:true,response:{cStat:"656",xMotivo:state.last_status_message}},429);
    let current=digits(state?.ult_nsu||"0").padStart(15,"0").slice(-15),last:any={cStat:"137",xMotivo:"Nenhum documento localizado",ultNSU:current,maxNSU:state?.max_nsu||current},newDocuments=0,newEvents=0,batches=0;
    for(let i=0;i<5;i++){
      if(i)await sleep(1300);
      const timestamp=String(Date.now()),bodyJson=JSON.stringify({certificate_base64:pfx,certificate_password:pass,cnpj,ufCode,uf_code:ufCode,ultNSU:current,ult_nsu:current,environment}),key=await crypto.subtle.importKey("raw",E.encode(service),{name:"HMAC",hash:"SHA-256"},false,["sign"]),signed=new Uint8Array(await crypto.subtle.sign("HMAC",key,E.encode(`dfe-bridge:${timestamp}:${bodyJson}`))),signature=[...signed].map(v=>v.toString(16).padStart(2,"0")).join("");
      const br=await fetch("https://ws-dfe-bridge.vercel.app/api/distribuicao",{method:"POST",headers:{"x-ws-timestamp":timestamp,"x-ws-signature":signature,"content-type":"application/json"},body:bodyJson,signal:AbortSignal.timeout(45000)});
      const payload=await br.json().catch(()=>({})) as any;if(!br.ok)throw new Error(`Bridge fiscal HTTP ${br.status}: ${payload?.error||"erro desconhecido"}`);const text=String(payload.raw_xml||"");if(!text)throw new Error("Bridge fiscal respondeu sem XML bruto");
      last=payload.response||{cStat:tag(text,"cStat"),xMotivo:tag(text,"xMotivo"),ultNSU:tag(text,"ultNSU"),maxNSU:tag(text,"maxNSU")};batches++;
      if(String(last.cStat)==="656"){await admin.from("fiscal_dfe_sync_state").upsert({user_id:user.id,cnpj,environment,uf_code:ufCode,ult_nsu:current,max_nsu:state?.max_nsu||current,last_status_code:"656",last_status_message:last.xMotivo||"Consumo indevido",last_synced_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:"user_id,cnpj,environment,uf_code"});return json({ok:false,cooldown:true,response:last},429)}
      const docs:any[]=[];const re=/<docZip\b([^>]*)>([\s\S]*?)<\/docZip>/gi;let m:RegExpExecArray|null;while((m=re.exec(text))){try{docs.push(parse(await gunzip(m[2]),attr(m[1],"schema"),attr(m[1],"NSU"),cnpj))}catch(e){console.error("docZip",e)}}
      const events=docs.filter(d=>d.kind==="evento"),notes=docs.filter(d=>d.kind!=="evento");
      if(events.length){const {error}=await admin.from("fiscal_dfe_events").upsert(events.map(d=>({user_id:user.id,company_id:companyId,cnpj,environment,uf_code:ufCode,nsu:d.nsu,schema_name:d.schema,access_key:d.accessKey||null,event_type:d.eventType,event_description:d.eventDescription,status_code:d.statusCode,event_at:d.issueDate,xml:d.xml,source:"national_dfe",updated_at:new Date().toISOString()})),{onConflict:"user_id,cnpj,environment,uf_code,nsu"});if(error)throw error;newEvents+=events.length}
      if(notes.length){const {error}=await admin.from("fiscal_dfe_documents").upsert(notes.map(d=>({user_id:user.id,company_id:companyId,cnpj,environment,uf_code:ufCode,nsu:d.nsu,source:"national_dfe",source_id:d.nsu,schema_name:d.schema,document_kind:d.kind,direction:d.direction,access_key:d.accessKey||null,model:d.model,issue_date:d.issueDate,value:d.value,issuer_cnpj:d.issuerCnpj||null,issuer_name:d.issuerName||null,recipient_cnpj:d.recipientCnpj||null,note_number:d.number,series:d.series,status_code:d.statusCode,full_xml:d.fullXml,xml:d.xml,updated_at:new Date().toISOString()})),{onConflict:"user_id,cnpj,environment,uf_code,nsu"});if(error)throw error;newDocuments+=notes.length}
      const next=digits(last.ultNSU||current).padStart(15,"0").slice(-15),max=digits(last.maxNSU||next).padStart(15,"0").slice(-15);current=next;
      await admin.from("fiscal_dfe_sync_state").upsert({user_id:user.id,cnpj,environment,uf_code:ufCode,ult_nsu:next,max_nsu:max,last_status_code:last.cStat||null,last_status_message:last.xMotivo||null,last_synced_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:"user_id,cnpj,environment,uf_code"});
      if(String(last.cStat)!=="138"||next>=max)break;
    }
    await admin.from("fiscal_companies").update({last_sync_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",companyId);
    const {data:stored}=await admin.from("fiscal_dfe_documents").select("*").eq("company_id",companyId).eq("environment",environment).order("issue_date",{ascending:false}).limit(5000);
    return json({ok:["137","138"].includes(String(last.cStat)),provider:"Ambiente Nacional NF-e",source:"national_dfe",environment,response:last,newDocuments,newEvents,batchCount:batches,documents:stored||[],scope:{received:true,emittedByCompany:false,note:"Compras/entradas vêm do Ambiente Nacional; vendas usam o conector estadual."}});
  }catch(e){console.error("dfe-extractor-native",e);return json({error:"Não foi possível concluir a sincronização fiscal"},500)}
});
