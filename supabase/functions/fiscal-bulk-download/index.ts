import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import JSZip from "npm:jszip@3.10.1";
import { PDFDocument, StandardFonts, degrees, rgb } from "npm:pdf-lib@1.17.1";

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
const fmtCnpj=(v:unknown)=>{const d=digits(v);return d.length===14?d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,"$1.$2.$3/$4-$5"):d||"-"};
const fmtDoc=(v:unknown)=>{const d=digits(v);if(d.length===14)return fmtCnpj(d);if(d.length===11)return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/,"$1.$2.$3-$4");return d||"-"};
const fmtKey=(v:unknown)=>digits(v).replace(/(\d{4})(?=\d)/g,"$1 ").trim();
const safe=(v:unknown)=>clean(v).replace(/[\\/:*?"<>|]+/g,"-").slice(0,90)||"documento";
const csv=(v:unknown)=>`"${String(v??"").replaceAll('"','""')}"`;
async function sha256(data:Uint8Array|string){const bytes=typeof data==="string"?new TextEncoder().encode(data):data;const h=new Uint8Array(await crypto.subtle.digest("SHA-256",bytes));return [...h].map(x=>x.toString(16).padStart(2,"0")).join("")}
function validFullXml(d:any){const xml=String(d.xml||"").trim();if(!d.full_xml||xml.length<100)return false;const kind=String(d.document_kind||"").toLowerCase(),key=String(d.access_key||"");if(kind==="nfse"||/nfse/i.test(`${d.schema_name||""} ${d.model||""}`))return /<[^>]*NFSe\b|<[^>]*infNFSe\b/i.test(xml);if(!/<(?:\w+:)?NFe\b|<(?:\w+:)?nfeProc\b/i.test(xml))return false;return !/^\d{44}$/.test(key)||xml.includes(key)||xml.includes(`NFe${key}`)}

async function buildPdf(doc:any){
  const xml=String(doc.xml||""),kind=String(doc.document_kind||"").toLowerCase(),isNFSe=kind==="nfse"||/nfse/i.test(`${doc.schema_name||""} ${doc.model||""}`),model=String(doc.model||"");
  const pdf=await PDFDocument.create(),regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);const W=595.28,H=841.89,M=22,CONTENT=W-M*2;let page=pdf.addPage([W,H]),y=H-M;const black=rgb(.07,.07,.07),gray=rgb(.94,.94,.94),white=rgb(1,1,1);
  const text=(t:string,x:number,yy:number,size=7,b=false,max=999)=>{let s=clean(t)||"-";while((b?bold:regular).widthOfTextAtSize(s,size)>max&&s.length>2)s=s.slice(0,-2)+"…";page.drawText(s,{x,y:yy,size,font:b?bold:regular,color:black})};
  const rect=(x:number,yy:number,w:number,h:number,fill?:any,th=.7)=>page.drawRectangle({x,y:yy,width:w,height:h,borderWidth:th,borderColor:black,color:fill});
  const label=(t:string,x:number,yy:number)=>text(t.toUpperCase(),x,yy,5.4,true);
  const field=(x:number,top:number,w:number,h:number,l:string,v:string,b=false)=>{rect(x,top-h,w,h,white);label(l,x+4,top-8);text(v,x+4,top-h+7,b?7.7:7,b,w-8)};
  const titleBar=(t:string)=>{y-=16;rect(M,y-14,CONTENT,14,gray);text(t,M+5,y-10,7,true);y-=18};
  const newPage=()=>{page=pdf.addPage([W,H]);y=H-M;};
  const emit=tag(xml,"emit"),dest=tag(xml,"dest"),ide=tag(xml,"ide"),tot=tag(xml,"ICMSTot"),prot=tag(xml,"infProt"),status=String(doc.status_text||tag(prot,"xMotivo")||doc.status_code||"-");
  const emitNome=tag(emit,"xNome")||doc.issuer_name||"Emitente não informado",destNome=tag(dest,"xNome")||"Consumidor / destinatário",note=doc.note_number||tag(ide,"nNF")||"-",series=doc.series||tag(ide,"serie")||"-",access=doc.access_key||tag(prot,"chNFe")||"-";
  const cancelled=/cancel/i.test(status)||["101","151","155"].includes(String(doc.status_code||""));
  const headerH=100;rect(M,y-headerH,CONTENT,headerH,white,1.1);rect(M,y-headerH,210,headerH,white,0);text(emitNome,M+9,y-23,12,true,192);text(`CNPJ ${fmtCnpj(tag(emit,"CNPJ")||doc.issuer_cnpj)}`,M+9,y-38,7,true);text(`IE ${tag(emit,"IE")||"-"}`,M+9,y-50,7);const end=tag(emit,"enderEmit");text(`${tag(end,"xLgr")||""}, ${tag(end,"nro")||""} ${tag(end,"xBairro")||""}`,M+9,y-65,6.3,false,192);text(`${tag(end,"xMun")||""} - ${tag(end,"UF")||""}`,M+9,y-78,6.3,false,192);
  rect(M+210,y-headerH,132,headerH,gray,0);text(isNFSe?"DANFSe":"DANFE",M+235,y-26,20,true);text(isNFSe?"Documento Auxiliar da NFS-e":"Documento Auxiliar da Nota Fiscal Eletrônica",M+218,y-42,5.4,true,116);text(`Nº ${note}`,M+230,y-63,10,true);text(`SÉRIE ${series}`,M+244,y-79,8,true);text("FL 1/1",M+257,y-93,6.4);
  rect(M+342,y-headerH,CONTENT-342,headerH,white,0);label("Chave de acesso",M+350,y-12);text(fmtKey(access),M+350,y-27,7.3,true,CONTENT-358);label("Protocolo de autorização",M+350,y-49);text(tag(prot,"nProt")||"-",M+350,y-64,7,true,CONTENT-358);label("Situação",M+350,y-81);text(status,M+350,y-94,6.5,true,CONTENT-358);y-=headerH+6;
  if(cancelled)page.drawText("CANCELADA",{x:138,y:y-48,size:46,font:bold,color:rgb(.82,.12,.12),opacity:.16,rotate:degrees(15)});
  field(M,y,CONTENT*.68,34,"Natureza da operação",tag(ide,"natOp")||(doc.direction==="saida"?"Venda / saída fiscal":"Entrada fiscal"),true);field(M+CONTENT*.68,y,CONTENT*.32,34,"Data de emissão",doc.issue_date?new Date(doc.issue_date).toLocaleString("pt-BR"):tag(ide,"dhEmi")||"-");y-=38;
  titleBar("Destinatário / Remetente");field(M,y,CONTENT*.55,32,"Nome / Razão social",destNome,true);field(M+CONTENT*.55,y,CONTENT*.25,32,"CNPJ / CPF",fmtDoc(tag(dest,"CNPJ")||tag(dest,"CPF")||doc.recipient_cnpj));field(M+CONTENT*.80,y,CONTENT*.20,32,"IE",tag(dest,"IE")||"-");y-=36;
  if(!isNFSe){titleBar("Cálculo do imposto");const cw=CONTENT/6;field(M,y,cw,32,"Base ICMS",money(tag(tot,"vBC")));field(M+cw,y,cw,32,"ICMS",money(tag(tot,"vICMS")),true);field(M+cw*2,y,cw,32,"ICMS ST",money(tag(tot,"vST")));field(M+cw*3,y,cw,32,"Produtos",money(tag(tot,"vProd")));field(M+cw*4,y,cw,32,"Desconto",money(tag(tot,"vDesc")));field(M+cw*5,y,cw,32,"Valor NF",money(tag(tot,"vNF")||doc.value),true);y-=38;const items=sections(xml,"det");titleBar(`Dados dos produtos / serviços (${items.length} itens)`);const cols=[22,205,50,38,48,48,48,50,42],heads=["#","Produto / Serviço","NCM","CFOP","Qtd.","Unit.","Total","BC ICMS","ICMS"];const drawHead=()=>{let x=M;for(let i=0;i<cols.length;i++){rect(x,y-20,cols[i],20,gray);text(heads[i],x+3,y-13,5.7,true,cols[i]-6);x+=cols[i]}y-=20};drawHead();for(let i=0;i<items.length;i++){if(y<90){newPage();drawHead()}const prod=tag(items[i],"prod"),imp=tag(items[i],"imposto"),icms=tag(imp,"ICMS"),vals=[String(i+1),tag(prod,"xProd")||"Produto",tag(prod,"NCM")||"-",tag(prod,"CFOP")||"-",`${tag(prod,"qCom")||"-"} ${tag(prod,"uCom")||""}`,money(tag(prod,"vUnCom")),money(tag(prod,"vProd")),money(tag(icms,"vBC")),money(tag(icms,"vICMS"))];let x=M;for(let c=0;c<cols.length;c++){rect(x,y-27,cols[c],27,white,.45);text(vals[c],x+3,y-11,c===1?6:5.7,c===0||c===6,cols[c]-6);x+=cols[c]}y-=27}}
  else{titleBar("Dados do serviço");const serv=tag(xml,"serv");field(M,y,CONTENT,46,"Descrição do serviço",tag(serv,"xDescServ")||tag(xml,"xDescServ")||tag(xml,"xTribNac")||"Serviço constante no XML",true);y-=50;const w=CONTENT/4;field(M,y,w,32,"Valor serviço",money(tag(xml,"vServ")||doc.value),true);field(M+w,y,w,32,"ISS",money(tag(xml,"vISSQN")||tag(xml,"vISS")));field(M+w*2,y,w,32,"Valor líquido",money(tag(xml,"vLiq")||doc.value),true);field(M+w*3,y,w,32,"Situação",status);y-=38}
  if(y<105)newPage();titleBar("Informações complementares");const obs=tag(tag(xml,"infAdic"),"infCpl")||tag(xml,"infCpl")||`Situação: ${status}. Protocolo: ${tag(prot,"nProt")||"-"}.`;rect(M,y-48,CONTENT,48,white);text(obs,M+5,y-13,6.2,false,CONTENT-10);text("WS Gestão Contábil · para validade fiscal, prevalecem o XML autorizado e o protocolo da SEFAZ.",M,24,5.1,false,CONTENT);return await pdf.save();
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response(null,{headers:cors});
  try{
    const auth=req.headers.get("authorization")||"";if(!auth)return J({error:"Não autenticado"},401);
    const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const{data:{user}}=await admin.auth.getUser(auth.replace(/^Bearer\s+/i,""));if(!user)return J({error:"Não autenticado"},401);
    const{data:roles}=await admin.from("user_roles").select("role").eq("user_id",user.id);if(!roles?.some((r:any)=>r.role==="admin"))return J({error:"Acesso exclusivo para administradores"},403);
    const b=await req.json().catch(()=>({})) as any,cid=String(b.company_id||""),raw=(Array.isArray(b.access_keys)?b.access_keys:[]).map((x:any)=>String(x).trim()).filter(Boolean);
    if(raw.length>5000)return J({error:"Seleção acima do limite seguro de 5.000 notas por pacote. Divida em dois pacotes; nenhuma nota foi descartada silenciosamente.",code:"TOO_MANY_DOCUMENTS",requested:raw.length},400);
    const keys=[...new Set(raw)];if(!cid||!keys.length)return J({error:"Selecione ao menos uma nota"},400);
    const{data:company}=await admin.from("fiscal_companies").select("id,cnpj,razao_social").eq("id",cid).single();if(!company)return J({error:"Empresa não encontrada"},404);
    const rows:any[]=[];for(let i=0;i<keys.length;i+=150){const{data,error}=await admin.from("fiscal_dfe_documents").select("*").eq("company_id",cid).in("access_key",keys.slice(i,i+150));if(error)throw error;rows.push(...(data||[]))}
    const map=new Map<string,any>();for(const d of rows){const k=String(d.access_key||"");if(!k)continue;const prev=map.get(k);if(!prev||(validFullXml(d)&&!validFullXml(prev)))map.set(k,d)}
    const missing=keys.filter(k=>!map.has(k)),notReady=keys.filter(k=>map.has(k)&&!validFullXml(map.get(k)));
    const report={requested:raw.length,unique_requested:keys.length,duplicates_in_request:raw.length-keys.length,located:keys.length-missing.length,ready:keys.length-missing.length-notReady.length,missing_count:missing.length,not_ready_count:notReady.length,ready_for_download:missing.length===0&&notReady.length===0,missing,not_ready:notReady.map(k=>{const d=map.get(k);return{access_key:k,note_number:d?.note_number||null,direction:d?.direction||null,status:d?.status_text||d?.status_code||null,reason:"XML fiscal completo ainda não disponível/validado"}})};
    if(String(b.action||"")==="preflight")return J({ok:true,...report});
    if(!report.ready_for_download)return J({error:"Pacote bloqueado: a conferência encontrou notas sem XML fiscal completo. Nenhum ZIP foi gerado.",code:"DOWNLOAD_NOT_READY",...report},409);
    const ordered=keys.map(k=>map.get(k)),zip=new JSZip(),manifest:any[]=[];let xmlCount=0,pdfCount=0;
    for(const d of ordered){const base=safe(`${String(d.document_kind||"documento").toUpperCase()}-${d.note_number||"sem-numero"}-${d.access_key}`),xml=String(d.xml),pdf=await buildPdf(d),xmlName=`XML/${base}.xml`,pdfName=`DANFE/${base}.pdf`,xmlHash=await sha256(xml),pdfHash=await sha256(pdf);zip.file(xmlName,xml);zip.file(pdfName,pdf);xmlCount++;pdfCount++;manifest.push({access_key:d.access_key,note_number:d.note_number,series:d.series,model:d.model,direction:d.direction,status:d.status_text||d.status_code||"",issue_date:d.issue_date,value:d.value,xml_file:xmlName,pdf_file:pdfName,xml_bytes:new TextEncoder().encode(xml).byteLength,pdf_bytes:pdf.byteLength,xml_sha256:xmlHash,pdf_sha256:pdfHash})}
    if(xmlCount!==keys.length||pdfCount!==keys.length||manifest.length!==keys.length)throw new Error("conferencia_interna_inconsistente");
    const conf=["chave;nota;serie;modelo;direcao;situacao;emissao;valor;arquivo_xml;bytes_xml;sha256_xml;arquivo_pdf;bytes_pdf;sha256_pdf",...manifest.map(m=>[m.access_key,m.note_number,m.series,m.model,m.direction,m.status,m.issue_date,m.value,m.xml_file,m.xml_bytes,m.xml_sha256,m.pdf_file,m.pdf_bytes,m.pdf_sha256].map(csv).join(";"))].join("\n");
    zip.file("CONFERENCIA.csv","\ufeff"+conf);zip.file("MANIFESTO.json",JSON.stringify({company:{id:company.id,cnpj:company.cnpj,name:company.razao_social},generated_at:new Date().toISOString(),requested:keys.length,verified:manifest.length,xml_files:xmlCount,pdf_files:pdfCount,integrity:"SHA-256 por arquivo",documents:manifest},null,2));zip.file("LEIA-ME.txt",[`WS Gestão — pacote fiscal conferido`,`Empresa: ${company.razao_social}`,`Notas solicitadas: ${keys.length}`,`Notas conferidas: ${manifest.length}`,`XMLs completos: ${xmlCount}`,`DANFEs/DANFSes: ${pdfCount}`,`Resultado: 100% CONFERIDO — nenhum documento parcial foi permitido.`].join("\n"));
    const bytes=await zip.generateAsync({type:"uint8array",compression:"DEFLATE",compressionOptions:{level:6}}),filename=`notas-${safe(company.razao_social)}-${new Date().toISOString().slice(0,10)}.zip`;
    return new Response(bytes,{status:200,headers:{...cors,"content-type":"application/zip","content-disposition":`attachment; filename=\"${filename}\"`,"x-ws-requested":String(keys.length),"x-ws-verified":String(manifest.length),"x-ws-files":String(xmlCount+pdfCount+3)}})
  }catch(e){return J({error:e instanceof Error?e.message:String(e)},500)}
});