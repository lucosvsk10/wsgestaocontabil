import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import JSZip from "npm:jszip@3.10.1";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers":"Content-Disposition, X-WS-Documents, X-WS-Full, X-WS-Summary"
};
const J=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,"content-type":"application/json"}});
const clean=(v:unknown)=>String(v??"").replace(/[\r\n\t]+/g," ").replace(/\s+/g," ").trim();
const digits=(v:unknown)=>String(v??"").replace(/\D/g,"");
const tag=(x:string,n:string)=>x.match(new RegExp(`<(?:\\w+:)?${n}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${n}>`,`i`))?.[1]?.trim()||"";
const sections=(x:string,n:string)=>[...x.matchAll(new RegExp(`<(?:\\w+:)?${n}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${n}>`,`gi`))].map(m=>m[1]);
const money=(v:unknown)=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const safe=(v:unknown)=>clean(v).replace(/[\\/:*?"<>|]+/g,"-").slice(0,90)||"documento";
const csv=(v:unknown)=>`"${String(v??"").replaceAll('"','""')}"`;
function validFullXml(d:any){const xml=String(d.xml||"").trim();if(!d.full_xml||xml.length<100)return false;const kind=String(d.document_kind||"").toLowerCase(),key=String(d.access_key||"");if(kind==="nfse"||/nfse/i.test(`${d.schema_name||""} ${d.model||""}`))return /<[^>]*NFSe\b|<[^>]*infNFSe\b/i.test(xml);if(!/<(?:\w+:)?NFe\b|<(?:\w+:)?nfeProc\b/i.test(xml))return false;return !/^\d{44}$/.test(key)||xml.includes(key)||xml.includes(`NFe${key}`)}
function fmtDate(v:any){if(!v)return"-";const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString("pt-BR",{timeZone:"America/Maceio"})}
function wrap(text:string,max=76){const words=clean(text).split(" ").filter(Boolean),out:string[]=[];let line="";for(const w of words){const n=line?`${line} ${w}`:w;if(n.length>max&&line){out.push(line);line=w}else line=n}if(line)out.push(line);return out.length?out:["-"]}
async function buildPdf(doc:any,complete:boolean){
  const xml=String(doc.xml||""),pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  let page=pdf.addPage([595.28,841.89]),y=800;const left=34,right=561,width=right-left;
  const box=(h:number,fill?:[number,number,number])=>{page.drawRectangle({x:left,y:y-h,width,height:h,borderWidth:1,borderColor:rgb(.15,.15,.15),color:fill?rgb(...fill):undefined});y-=h};
  const text=(t:string,x:number,yy:number,size=8,b=false)=>page.drawText(clean(t)||"-",{x,y:yy,size,font:b?bold:font,color:rgb(.05,.05,.05)});
  const lines=(t:string,x:number,size=8,b=false,max=76)=>{for(const l of wrap(t,max)){if(y<55){page=pdf.addPage([595.28,841.89]);y=800}text(l,x,y,size,b);y-=size+4}};
  const cancelled=/cancel/i.test(String(doc.status_text||""))||["101","151","155"].includes(String(doc.status_code||""));
  box(64,[.97,.97,.97]);text(complete?"DANFE / DOCUMENTO FISCAL COMPLETO":"RESUMO DE DOCUMENTO FISCAL",left+12,y+42,16,true);text(complete?"Gerado a partir do XML fiscal completo armazenado":"XML integral não disponível na fonte fiscal neste momento",left+12,y+25,8,true);text(`NF ${doc.note_number||"-"}  Série ${doc.series||"-"}  Modelo ${doc.model||"-"}`,left+360,y+42,8,true);text(money(doc.value),left+360,y+24,11,true);
  if(cancelled){page.drawText("CANCELADA",{x:185,y:430,size:44,font:bold,color:rgb(.8,.15,.15),rotate:{type:"degrees",angle:35} as any,opacity:.16})}
  y-=10;lines(`Chave de acesso: ${doc.access_key||"-"}`,left,8,true,92);lines(`Emissão: ${fmtDate(doc.issue_date)}   Situação: ${doc.status_text||doc.status_code||"-"}`,left,8,false,92);y-=4;
  const isNFSe=String(doc.document_kind||"").toLowerCase()==="nfse"||/nfse/i.test(`${doc.schema_name||""} ${doc.model||""}`);
  if(complete&&xml){
    if(isNFSe){const emit=tag(xml,"emit"),toma=tag(xml,"toma"),serv=tag(xml,"serv");lines("PRESTADOR",left,9,true);lines(`${tag(emit,"xNome")||doc.issuer_name||"-"} — CNPJ ${digits(tag(emit,"CNPJ")||doc.issuer_cnpj)||"-"}`,left,8);y-=3;lines("TOMADOR",left,9,true);lines(`${tag(toma,"xNome")||"-"} — ${digits(tag(toma,"CNPJ")||doc.recipient_cnpj)||"-"}`,left,8);y-=3;lines("SERVIÇO",left,9,true);lines(tag(serv,"xDescServ")||tag(xml,"xDescServ")||tag(xml,"xTribNac")||"Serviço constante no XML",left,8);}
    else{const emit=tag(xml,"emit"),dest=tag(xml,"dest"),ide=tag(xml,"ide"),tot=tag(xml,"ICMSTot");lines("EMITENTE",left,9,true);lines(`${tag(emit,"xNome")||doc.issuer_name||"-"} — CNPJ ${digits(tag(emit,"CNPJ")||doc.issuer_cnpj)||"-"} — IE ${tag(emit,"IE")||"-"}`,left,8);y-=3;lines("DESTINATÁRIO",left,9,true);lines(`${tag(dest,"xNome")||"-"} — CNPJ/CPF ${digits(tag(dest,"CNPJ")||tag(dest,"CPF")||doc.recipient_cnpj)||"-"}`,left,8);lines(`Natureza da operação: ${tag(ide,"natOp")||"-"}`,left,8);y-=4;lines(`Produtos ${money(tag(tot,"vProd"))}  |  Frete ${money(tag(tot,"vFrete"))}  |  Desconto ${money(tag(tot,"vDesc"))}  |  ICMS ${money(tag(tot,"vICMS"))}  |  IPI ${money(tag(tot,"vIPI"))}  |  Total NF ${money(tag(tot,"vNF")||doc.value)}`,left,8,true,92);y-=6;const items=sections(xml,"det");lines(`ITENS DA NOTA (${items.length})`,left,9,true);for(let i=0;i<items.length;i++){const p=tag(items[i],"prod");lines(`${i+1}. ${tag(p,"xProd")||"Produto"}`,left,8,true);lines(`Cód ${tag(p,"cProd")||"-"} | NCM ${tag(p,"NCM")||"-"} | CFOP ${tag(p,"CFOP")||"-"} | Qtd ${tag(p,"qCom")||"-"} ${tag(p,"uCom")||""} | Unit ${money(tag(p,"vUnCom"))} | Total ${money(tag(p,"vProd"))}`,left+8,7,false,88);y-=2}const prot=tag(xml,"infProt");if(prot){y-=4;lines("PROTOCOLO DE AUTORIZAÇÃO",left,9,true);lines(`${tag(prot,"nProt")||"-"} — ${tag(prot,"xMotivo")||"-"} — ${tag(prot,"dhRecbto")||"-"}`,left,8)}}
  }else{
    lines("DADOS DISPONÍVEIS NA FONTE FISCAL",left,9,true);lines(`Emitente: ${doc.issuer_name||"-"}`,left,8);lines(`CNPJ emitente: ${digits(doc.issuer_cnpj)||"-"}`,left,8);lines(`CNPJ destinatário: ${digits(doc.recipient_cnpj)||"-"}`,left,8);lines(`Valor total: ${money(doc.value)}`,left,9,true);y-=8;lines("Este arquivo é um resumo fiscal. Ele representa integralmente os dados disponíveis para esta chave na base consultada, mas não substitui um XML autorizado que ainda não tenha sido disponibilizado.",left,7,false,92);
  }
  return await pdf.save();
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response(null,{headers:cors});
  try{
    const auth=req.headers.get("authorization")||"";if(!auth)return J({error:"Não autenticado"},401);
    const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const{data:{user}}=await admin.auth.getUser(auth.replace(/^Bearer\s+/i,""));if(!user)return J({error:"Não autenticado"},401);
    const{data:roles}=await admin.from("user_roles").select("role").eq("user_id",user.id);if(!roles?.some((r:any)=>r.role==="admin"))return J({error:"Acesso exclusivo para administradores"},403);
    const b=await req.json().catch(()=>({})) as any,cid=String(b.company_id||""),start=String(b.start||""),end=String(b.end||""),direction=String(b.direction||"todos");
    if(!cid||!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||start>end)return J({error:"Período inválido"},400);
    const{data:company}=await admin.from("fiscal_companies").select("id,cnpj,razao_social").eq("id",cid).single();if(!company)return J({error:"Empresa não encontrada"},404);
    let q=admin.from("fiscal_dfe_documents").select("*").eq("company_id",cid).neq("document_kind","evento").gte("issue_date",`${start}T00:00:00-03:00`).lte("issue_date",`${end}T23:59:59-03:00`).order("issue_date",{ascending:true});
    if(direction==="entrada"||direction==="saida")q=q.eq("direction",direction);
    const{data:rows,error}=await q.limit(5000);if(error)throw error;
    const map=new Map<string,any>();for(const d of rows||[]){const key=String(d.access_key||d.nsu||"");if(!key)continue;const prev=map.get(key);if(!prev||(validFullXml(d)&&!validFullXml(prev)))map.set(key,d)}
    const docs=[...map.values()].sort((a,b)=>String(a.issue_date||"").localeCompare(String(b.issue_date||"")));
    if(!docs.length)return J({error:"Nenhuma nota encontrada no período informado",code:"NO_DOCUMENTS"},404);
    const full=docs.filter(validFullXml),summary=docs.filter(d=>!validFullXml(d));
    const report={ok:true,total:docs.length,full:full.length,summary:summary.length,start,end,direction,ready:true};
    if(String(b.action||"")==="preflight")return J(report);
    const zip=new JSZip(),manifest:any[]=[];
    for(const d of docs){const complete=validFullXml(d),base=safe(`${String(d.document_kind||"documento").toUpperCase()}-${d.note_number||"sem-numero"}-${d.access_key||d.nsu}`),pdf=await buildPdf(d,complete),pdfPath=`DANFE/${complete?"COMPLETOS":"RESUMOS"}/${base}.pdf`;zip.file(pdfPath,pdf);let xmlPath="";if(complete){xmlPath=`XML/${base}.xml`;zip.file(xmlPath,String(d.xml))}manifest.push({access_key:d.access_key||null,note_number:d.note_number||null,series:d.series||null,model:d.model||null,direction:d.direction||null,status:d.status_text||d.status_code||null,issue_date:d.issue_date||null,value:d.value||0,document_quality:complete?"completo_xml_oficial":"resumo_fonte_fiscal",pdf_file:pdfPath,xml_file:xmlPath||null})}
    const conf=["chave;nota;serie;modelo;direcao;situacao;emissao;valor;qualidade;pdf;xml",...manifest.map(m=>[m.access_key,m.note_number,m.series,m.model,m.direction,m.status,m.issue_date,m.value,m.document_quality,m.pdf_file,m.xml_file].map(csv).join(";"))].join("\n");
    zip.file("CONFERENCIA.csv","\ufeff"+conf);zip.file("MANIFESTO.json",JSON.stringify({company:{id:company.id,cnpj:company.cnpj,name:company.razao_social},generated_at:new Date().toISOString(),period:{start,end,direction},total:docs.length,full:full.length,summary:summary.length,documents:manifest},null,2));zip.file("LEIA-ME.txt",[`WS Gestão — pacote fiscal por período`,`Empresa: ${company.razao_social}`,`Período: ${start} a ${end}`,`Escopo: ${direction}`,`Notas encontradas: ${docs.length}`,`Documentos completos (XML + DANFE/DANFSe): ${full.length}`,`Documentos sem XML integral, baixados como resumo fiscal: ${summary.length}`,`Resultado: todas as ${docs.length} notas localizadas no período foram incluídas no pacote.`,`Consulte CONFERENCIA.csv para saber exatamente quais são completas e quais são resumo.`].join("\n"));
    const bytes=await zip.generateAsync({type:"uint8array",compression:"DEFLATE",compressionOptions:{level:6}}),filename=`notas-${safe(company.razao_social)}-${start}-a-${end}.zip`;
    return new Response(bytes,{status:200,headers:{...cors,"content-type":"application/zip","content-disposition":`attachment; filename=\"${filename}\"`,"x-ws-documents":String(docs.length),"x-ws-full":String(full.length),"x-ws-summary":String(summary.length)}})
  }catch(e){return J({error:e instanceof Error?e.message:String(e)},500)}
});