import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import JSZip from "npm:jszip@3.10.1";
import { PDFDocument, StandardFonts } from "npm:pdf-lib@1.17.1";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers":"Content-Disposition, X-WS-Requested, X-WS-Verified, X-WS-Files"
};
const J=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,"content-type":"application/json"}});
const clean=(v:unknown)=>String(v??"").replace(/[\r\n\t]+/g," ").replace(/\s+/g," ").trim();
const digits=(v:unknown)=>String(v??"").replace(/\D/g,"");
const tag=(x:string,n:string)=>x.match(new RegExp(`<(?:\\w+:)?${n}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${n}>`,`i`))?.[1]?.trim()||"";
const sections=(x:string,n:string)=>[...x.matchAll(new RegExp(`<(?:\\w+:)?${n}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${n}>`,`gi`))].map(m=>m[1]);
const money=(v:unknown)=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const safe=(v:unknown)=>clean(v).replace(/[\\/:*?"<>|]+/g,"-").slice(0,90)||"documento";
const csv=(v:unknown)=>`"${String(v??"").replaceAll('"','""')}"`;
function wrap(text:string,max=90){const words=clean(text).split(" ").filter(Boolean),out:string[]=[];let line="";for(const w of words){const n=line?`${line} ${w}`:w;if(n.length>max&&line){out.push(line);line=w}else line=n}if(line)out.push(line);return out.length?out:["-"]}
async function sha256(data:Uint8Array|string){const bytes=typeof data==="string"?new TextEncoder().encode(data):data;const h=new Uint8Array(await crypto.subtle.digest("SHA-256",bytes));return [...h].map(x=>x.toString(16).padStart(2,"0")).join("")}
function validFullXml(d:any){const xml=String(d.xml||"").trim();if(!d.full_xml||xml.length<100)return false;const kind=String(d.document_kind||"").toLowerCase(),key=String(d.access_key||"");if(kind==="nfse"||/nfse/i.test(`${d.schema_name||""} ${d.model||""}`))return /<[^>]*NFSe\b|<[^>]*infNFSe\b/i.test(xml);if(!/<(?:\w+:)?NFe\b|<(?:\w+:)?nfeProc\b/i.test(xml))return false;return !/^\d{44}$/.test(key)||xml.includes(key)||xml.includes(`NFe${key}`)}
async function buildPdf(doc:any){
  const xml=String(doc.xml||""),pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);let page=pdf.addPage([595.28,841.89]),y=805;const margin=34;
  const line=(txt:string,size=8,b=false,indent=0)=>{for(const l of wrap(txt,Math.max(30,Math.floor((520-indent)/(size*.52))))){if(y<48){page=pdf.addPage([595.28,841.89]);y=805}page.drawText(clean(l)||"-",{x:margin+indent,y,size,font:b?bold:font});y-=size+4}};
  const kind=String(doc.document_kind||"").toLowerCase(),isNFSe=kind==="nfse"||/nfse/i.test(`${doc.schema_name||""} ${doc.model||""}`),model=String(doc.model||"");
  line(isNFSe?"DANFSe / Documento Auxiliar da NFS-e":model==="65"?"DANFE NFC-e":"DANFE NF-e",16,true);
  line("Documento gerado exclusivamente a partir do XML fiscal completo armazenado.",7,true);
  line(`Chave: ${doc.access_key||"-"}`,8,true);line(`Nota: ${doc.note_number||"-"} | Série: ${doc.series||"-"} | Modelo: ${model||"-"}`);line(`Emissão: ${doc.issue_date?new Date(doc.issue_date).toLocaleString("pt-BR"):"-"} | Situação: ${doc.status_text||doc.status_code||"-"}`);line(`Valor total: ${money(doc.value)}`,10,true);y-=6;
  if(isNFSe){const emit=tag(xml,"emit"),toma=tag(xml,"toma"),serv=tag(xml,"serv");line("PRESTADOR",9,true);line(`${tag(emit,"xNome")||doc.issuer_name||"-"} — ${digits(tag(emit,"CNPJ")||doc.issuer_cnpj)||"-"}`);line("TOMADOR",9,true);line(`${tag(toma,"xNome")||"-"} — ${digits(tag(toma,"CNPJ")||doc.recipient_cnpj)||"-"}`);line("SERVIÇO",9,true);line(tag(serv,"xDescServ")||tag(xml,"xDescServ")||tag(xml,"xTribNac")||"Serviço constante no XML");line(`Valor do serviço: ${money(tag(xml,"vServ")||tag(xml,"vLiq")||doc.value)}`)}
  else{const emit=tag(xml,"emit"),dest=tag(xml,"dest"),ide=tag(xml,"ide"),tot=tag(xml,"ICMSTot");line("EMITENTE",9,true);line(`${tag(emit,"xNome")||doc.issuer_name||"-"} — CNPJ ${digits(tag(emit,"CNPJ")||doc.issuer_cnpj)||"-"} — IE ${tag(emit,"IE")||"-"}`);line("DESTINATÁRIO",9,true);line(`${tag(dest,"xNome")||"-"} — CNPJ/CPF ${digits(tag(dest,"CNPJ")||tag(dest,"CPF")||doc.recipient_cnpj)||"-"}`);line(`Natureza da operação: ${tag(ide,"natOp")||"-"}`);line("TOTAIS",9,true);line(`Produtos ${money(tag(tot,"vProd"))} | Frete ${money(tag(tot,"vFrete"))} | Desconto ${money(tag(tot,"vDesc"))} | ICMS ${money(tag(tot,"vICMS"))} | IPI ${money(tag(tot,"vIPI"))} | PIS ${money(tag(tot,"vPIS"))} | COFINS ${money(tag(tot,"vCOFINS"))} | NF ${money(tag(tot,"vNF")||doc.value)}`);const itens=sections(xml,"det");line(`ITENS (${itens.length})`,9,true);for(let i=0;i<itens.length;i++){const prod=tag(itens[i],"prod");line(`${i+1}. ${tag(prod,"xProd")||"Produto"}`,8,true);line(`Código ${tag(prod,"cProd")||"-"} | NCM ${tag(prod,"NCM")||"-"} | CFOP ${tag(prod,"CFOP")||"-"} | Qtd ${tag(prod,"qCom")||"-"} ${tag(prod,"uCom")||""} | Unit. ${money(tag(prod,"vUnCom"))} | Total ${money(tag(prod,"vProd"))}`,7,false,8)}const prot=tag(xml,"infProt");if(prot){line("PROTOCOLO",9,true);line(`${tag(prot,"nProt")||"-"} — ${tag(prot,"xMotivo")||"-"} — ${tag(prot,"dhRecbto")||"-"}`)}}
  return await pdf.save();
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response(null,{headers:cors});
  try{
    const auth=req.headers.get("authorization")||"";if(!auth)return J({error:"Não autenticado"},401);
    const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const{data:{user}}=await admin.auth.getUser(auth.replace(/^Bearer\s+/i,""));if(!user)return J({error:"Não autenticado"},401);
    const{data:roles}=await admin.from("user_roles").select("role").eq("user_id",user.id);if(!roles?.some((r:any)=>r.role==="admin"))return J({error:"Acesso exclusivo para administradores"},403);
    const b=await req.json().catch(()=>({})) as any,cid=String(b.company_id||""),raw=(Array.isArray(b.access_keys)?b.access_keys:[]).map((x:any)=>String(x).trim()).filter(Boolean).slice(0,500),keys=[...new Set(raw)];
    if(!cid||!keys.length)return J({error:"Selecione ao menos uma nota"},400);
    const{data:company}=await admin.from("fiscal_companies").select("id,cnpj,razao_social").eq("id",cid).single();if(!company)return J({error:"Empresa não encontrada"},404);
    const{data:rows,error}=await admin.from("fiscal_dfe_documents").select("*").eq("company_id",cid).in("access_key",keys);if(error)throw error;
    const map=new Map<string,any>();for(const d of rows||[]){const k=String(d.access_key||"");if(!k)continue;const prev=map.get(k);if(!prev||(validFullXml(d)&&!validFullXml(prev)))map.set(k,d)}
    const missing=keys.filter(k=>!map.has(k));const notReady=keys.filter(k=>map.has(k)&&!validFullXml(map.get(k)));
    const report={requested:raw.length,unique_requested:keys.length,located:keys.length-missing.length,ready:keys.length-missing.length-notReady.length,missing_count:missing.length,not_ready_count:notReady.length,ready_for_download:missing.length===0&&notReady.length===0,missing,not_ready:notReady.map(k=>{const d=map.get(k);return{access_key:k,note_number:d?.note_number||null,direction:d?.direction||null,status:d?.status_text||d?.status_code||null,reason:"XML fiscal completo ainda não disponível/validado"}})};
    if(String(b.action||"")==="preflight")return J({ok:true,...report});
    if(!report.ready_for_download)return J({error:"Pacote bloqueado: a conferência encontrou notas sem XML fiscal completo. Nenhum ZIP foi gerado.",code:"DOWNLOAD_NOT_READY",...report},409);
    const ordered=keys.map(k=>map.get(k));const zip=new JSZip(),manifest:any[]=[];
    let xmlCount=0,pdfCount=0;
    for(const d of ordered){const base=safe(`${String(d.document_kind||"documento").toUpperCase()}-${d.note_number||"sem-numero"}-${d.access_key}`),xml=String(d.xml),pdf=await buildPdf(d),xmlName=`XML/${base}.xml`,pdfName=`DANFE/${base}.pdf`,xmlHash=await sha256(xml),pdfHash=await sha256(pdf);zip.file(xmlName,xml);zip.file(pdfName,pdf);xmlCount++;pdfCount++;manifest.push({access_key:d.access_key,note_number:d.note_number,series:d.series,model:d.model,direction:d.direction,status:d.status_text||d.status_code||"",issue_date:d.issue_date,value:d.value,xml_file:xmlName,pdf_file:pdfName,xml_bytes:new TextEncoder().encode(xml).byteLength,pdf_bytes:pdf.byteLength,xml_sha256:xmlHash,pdf_sha256:pdfHash})}
    if(xmlCount!==keys.length||pdfCount!==keys.length||manifest.length!==keys.length)throw new Error("conferencia_interna_inconsistente");
    const conf=["chave;nota;serie;modelo;direcao;situacao;emissao;valor;arquivo_xml;bytes_xml;sha256_xml;arquivo_pdf;bytes_pdf;sha256_pdf",...manifest.map(m=>[m.access_key,m.note_number,m.series,m.model,m.direction,m.status,m.issue_date,m.value,m.xml_file,m.xml_bytes,m.xml_sha256,m.pdf_file,m.pdf_bytes,m.pdf_sha256].map(csv).join(";"))].join("\n");
    zip.file("CONFERENCIA.csv","\ufeff"+conf);zip.file("MANIFESTO.json",JSON.stringify({company:{id:company.id,cnpj:company.cnpj,name:company.razao_social},generated_at:new Date().toISOString(),requested:keys.length,verified:manifest.length,xml_files:xmlCount,pdf_files:pdfCount,integrity:"SHA-256 por arquivo",documents:manifest},null,2));zip.file("LEIA-ME.txt",[`WS Gestão — pacote fiscal conferido`,`Empresa: ${company.razao_social}`,`Gerado em: ${new Date().toLocaleString("pt-BR",{timeZone:"America/Maceio"})}`,`Notas solicitadas: ${keys.length}`,`Notas conferidas: ${manifest.length}`,`XMLs completos: ${xmlCount}`,`DANFEs/DANFSes: ${pdfCount}`,`Resultado: 100% CONFERIDO — nenhum documento parcial foi permitido.`,`Use CONFERENCIA.csv ou MANIFESTO.json para auditar cada chave e o SHA-256 de cada arquivo.`].join("\n"));
    const bytes=await zip.generateAsync({type:"uint8array",compression:"DEFLATE",compressionOptions:{level:6}}),filename=`notas-${safe(company.razao_social)}-${new Date().toISOString().slice(0,10)}.zip`;
    return new Response(bytes,{status:200,headers:{...cors,"content-type":"application/zip","content-disposition":`attachment; filename=\"${filename}\"`,"x-ws-requested":String(keys.length),"x-ws-verified":String(manifest.length),"x-ws-files":String(xmlCount+pdfCount+3)}})
  }catch(e){return J({error:e instanceof Error?e.message:String(e)},500)}
});