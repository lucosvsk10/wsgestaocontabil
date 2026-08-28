import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const J=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,"content-type":"application/json"}});
const clean=(v:unknown)=>String(v??"").replace(/[\r\n\t]+/g," ").replace(/\s+/g," ").trim();
const dg=(v:unknown)=>String(v??"").replace(/\D/g,"");
const tag=(x:string,n:string)=>x.match(new RegExp(`<(?:\\w+:)?${n}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${n}>`,`i`))?.[1]?.trim()||"";
const sections=(x:string,n:string)=>[...x.matchAll(new RegExp(`<(?:\\w+:)?${n}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${n}>`,`gi`))].map(m=>m[1]);
const money=(v:unknown)=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const cnpj=(v:unknown)=>{const d=dg(v);return d.length===14?d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,"$1.$2.$3/$4-$5"):d||"-"};
const cpfCnpj=(v:unknown)=>{const d=dg(v);if(d.length===14)return cnpj(d);if(d.length===11)return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/,"$1.$2.$3-$4");return d||"-"};
const dt=(v:unknown)=>{const d=new Date(String(v||""));return Number.isNaN(d.getTime())?clean(v)||"-":d.toLocaleString("pt-BR")};
const fmtKey=(v:unknown)=>dg(v).replace(/(\d{4})(?=\d)/g,"$1 ").trim();

Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{headers:cors});
 try{
  const auth=req.headers.get("authorization")||"";if(!auth)return J({error:"Não autenticado"},401);
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const{data:{user}}=await admin.auth.getUser(auth.replace(/^Bearer\s+/i,""));if(!user)return J({error:"Não autenticado"},401);
  const{data:roles}=await admin.from("user_roles").select("role").eq("user_id",user.id);if(!roles?.some((r:any)=>r.role==="admin"))return J({error:"Acesso exclusivo para administradores"},403);
  const body=await req.json().catch(()=>({})) as any,doc=body.document||{};
  if(doc.documentKind==="evento"||doc.direction==="relacionada")return J({error:"PDF não disponível para evento fiscal"},422);
  const xml=String(doc.xml||""),isNFSe=doc.documentKind==="nfse"||/nfse/i.test(`${doc.schema||""} ${doc.model||""}`),full=Boolean(doc.fullXml&&xml),model=String(doc.model||"");
  const pdf=await PDFDocument.create(),regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const W=595.28,H=841.89,M=22,CONTENT=W-M*2;let page=pdf.addPage([W,H]),y=H-M;
  const black=rgb(0.07,0.07,0.07),gray=rgb(.94,.94,.94),mid=rgb(.45,.45,.45),white=rgb(1,1,1);
  const text=(t:string,x:number,yy:number,size=7,b=false,max=999)=>{let s=clean(t)||"-";while((b?bold:regular).widthOfTextAtSize(s,size)>max&&s.length>2)s=s.slice(0,-2)+"…";page.drawText(s,{x,y:yy,size,font:b?bold:regular,color:black})};
  const rect=(x:number,yy:number,w:number,h:number,fill?:any,th=0.7)=>page.drawRectangle({x,y:yy,width:w,height:h,borderWidth:th,borderColor:black,color:fill});
  const label=(t:string,x:number,yy:number)=>text(t.toUpperCase(),x,yy,5.5,true);
  const field=(x:number,top:number,w:number,h:number,l:string,v:string,opts?:{bold?:boolean;size?:number;fill?:any})=>{rect(x,top-h,w,h,opts?.fill);label(l,x+4,top-8);text(v,x+4,top-h+7,opts?.size||7.4,opts?.bold||false,w-8)};
  const titleBar=(t:string)=>{y-=17;rect(M,y-14,CONTENT,14,gray);text(t,M+5,y-10,7,true);y-=18};
  const newPage=()=>{page=pdf.addPage([W,H]);y=H-M;};

  const emit=tag(xml,"emit"),dest=tag(xml,"dest"),ide=tag(xml,"ide"),tot=tag(xml,"ICMSTot"),prot=tag(xml,"infProt");
  const emitNome=tag(emit,"xNome")||doc.issuerName||"Emitente não informado",emitCnpj=cnpj(tag(emit,"CNPJ")||doc.issuerCnpj),destNome=tag(dest,"xNome")||"Consumidor / destinatário",destDoc=cpfCnpj(tag(dest,"CNPJ")||tag(dest,"CPF")||doc.recipientCnpj);
  const note=doc.number||tag(ide,"nNF")||"-",series=doc.series||tag(ide,"serie")||"-",access=doc.accessKey||tag(prot,"chNFe")||"-",status=doc.statusText||tag(prot,"xMotivo")||doc.statusCode||"-";
  const cancelled=/cancel/i.test(status)||["101","151","155"].includes(String(doc.statusCode||""));

  // Cabeçalho com aparência de DANFE tradicional
  const headerH=102;rect(M,y-headerH,CONTENT,headerH,white,1.1);
  rect(M,y-headerH,210,headerH,white,0);text(emitNome,M+9,y-24,12,true,192);text(`CNPJ ${emitCnpj}`,M+9,y-39,7,true);text(`IE ${tag(emit,"IE")||"-"}`,M+9,y-51,7);const end=tag(emit,"enderEmit");text(`${tag(end,"xLgr")||""}, ${tag(end,"nro")||""} ${tag(end,"xBairro")||""}`,M+9,y-66,6.5,false,192);text(`${tag(end,"xMun")||""} - ${tag(end,"UF")||""}  CEP ${tag(end,"CEP")||""}`,M+9,y-78,6.5,false,192);
  rect(M+210,y-headerH,132,headerH,gray,0);text(isNFSe?"DANFSe":"DANFE",M+235,y-26,20,true);text(isNFSe?"Documento Auxiliar da NFS-e":"Documento Auxiliar da Nota Fiscal Eletrônica",M+218,y-42,5.5,true,116);text(`Nº ${note}`,M+230,y-64,10,true);text(`SÉRIE ${series}`,M+244,y-80,8,true);text(`FL 1/1`,M+257,y-94,6.5);
  rect(M+342,y-headerH,CONTENT-342,headerH,white,0);label("Chave de acesso",M+350,y-12);text(fmtKey(access),M+350,y-27,7.5,true,CONTENT-358);label("Consulta de autenticidade",M+350,y-45);text("Documento eletrônico autorizado pela administração tributária",M+350,y-59,5.8,false,CONTENT-358);label("Protocolo de autorização",M+350,y-74);text(tag(prot,"nProt")||"-",M+350,y-90,7,true,CONTENT-358);
  y-=headerH+6;

  if(cancelled){page.drawText("CANCELADA",{x:138,y:y-52,size:46,font:bold,color:rgb(.82,.12,.12),opacity:.16,rotate:{type:"degrees",angle:15} as any});}
  if(!full){rect(M,y-26,CONTENT,26,gray);text("PRÉVIA — XML fiscal completo ainda está em recuperação. Este PDF não é liberado em downloads em lote.",M+7,y-17,7,true,CONTENT-14);y-=32}

  field(M,y,CONTENT*.68,36,"Natureza da operação",tag(ide,"natOp")|| (doc.direction==="saida"?"Venda / saída fiscal":"Entrada fiscal"),{bold:true,size:7.6});
  field(M+CONTENT*.68,y,CONTENT*.32,36,"Data e hora de emissão",doc.issueDate?dt(doc.issueDate):dt(tag(ide,"dhEmi")),{size:7});y-=40;

  titleBar("Destinatário / Remetente");
  field(M,y,CONTENT*.55,34,"Nome / Razão social",destNome,{bold:true});field(M+CONTENT*.55,y,CONTENT*.25,34,"CNPJ / CPF",destDoc);field(M+CONTENT*.80,y,CONTENT*.20,34,"IE",tag(dest,"IE")||"-");y-=38;
  const ed=tag(dest,"enderDest");field(M,y,CONTENT*.48,34,"Endereço",`${tag(ed,"xLgr")||"-"}, ${tag(ed,"nro")||"-"}`);field(M+CONTENT*.48,y,CONTENT*.22,34,"Bairro",tag(ed,"xBairro")||"-");field(M+CONTENT*.70,y,CONTENT*.20,34,"Município",tag(ed,"xMun")||"-");field(M+CONTENT*.90,y,CONTENT*.10,34,"UF",tag(ed,"UF")||"-");y-=38;

  if(!isNFSe){
    titleBar("Cálculo do imposto");
    const cw=CONTENT/6;field(M,y,cw,34,"Base ICMS",money(tag(tot,"vBC")));field(M+cw,y,cw,34,"Valor ICMS",money(tag(tot,"vICMS")),{bold:true});field(M+cw*2,y,cw,34,"Base ICMS ST",money(tag(tot,"vBCST")));field(M+cw*3,y,cw,34,"Valor ICMS ST",money(tag(tot,"vST")));field(M+cw*4,y,cw,34,"Valor produtos",money(tag(tot,"vProd")));field(M+cw*5,y,cw,34,"Valor da NF",money(tag(tot,"vNF")||doc.value),{bold:true,size:8});y-=38;
    field(M,y,cw,34,"Frete",money(tag(tot,"vFrete")));field(M+cw,y,cw,34,"Seguro",money(tag(tot,"vSeg")));field(M+cw*2,y,cw,34,"Desconto",money(tag(tot,"vDesc")));field(M+cw*3,y,cw,34,"IPI",money(tag(tot,"vIPI")));field(M+cw*4,y,cw,34,"PIS",money(tag(tot,"vPIS")));field(M+cw*5,y,cw,34,"COFINS",money(tag(tot,"vCOFINS")));y-=42;

    const items=sections(xml,"det");titleBar(`Dados dos produtos / serviços (${items.length} itens)`);
    const cols=[22,205,50,38,48,48,48,50,42];const heads=["#","Produto / Serviço","NCM","CFOP","Qtd.","Unit.","Total","BC ICMS","ICMS"];
    const drawHead=()=>{let x=M;for(let i=0;i<cols.length;i++){rect(x,y-20,cols[i],20,gray);text(heads[i],x+3,y-13,5.8,true,cols[i]-6);x+=cols[i]}y-=20};drawHead();
    for(let i=0;i<items.length;i++){
      if(y<95){newPage();drawHead()}
      const prod=tag(items[i],"prod"),imp=tag(items[i],"imposto"),icms=tag(imp,"ICMS"),rowH=28;let x=M;const vals=[String(i+1),tag(prod,"xProd")||"Produto",tag(prod,"NCM")||"-",tag(prod,"CFOP")||"-",`${tag(prod,"qCom")||"-"} ${tag(prod,"uCom")||""}`,money(tag(prod,"vUnCom")),money(tag(prod,"vProd")),money(tag(icms,"vBC")),money(tag(icms,"vICMS"))];
      for(let c=0;c<cols.length;c++){rect(x,y-rowH,cols[c],rowH,white,.45);text(vals[c],x+3,y-11,c===1?6.1:5.8,c===0||c===6,cols[c]-6);x+=cols[c]}y-=rowH;
    }
  }else{
    titleBar("Dados do serviço");const serv=tag(xml,"serv");field(M,y,CONTENT,48,"Descrição do serviço",tag(serv,"xDescServ")||tag(xml,"xDescServ")||tag(xml,"xTribNac")||"Serviço constante no XML",{bold:true});y-=52;const w=CONTENT/4;field(M,y,w,34,"Valor serviço",money(tag(xml,"vServ")||doc.value),{bold:true});field(M+w,y,w,34,"ISS",money(tag(xml,"vISSQN")||tag(xml,"vISS")));field(M+w*2,y,w,34,"Valor líquido",money(tag(xml,"vLiq")||doc.value),{bold:true});field(M+w*3,y,w,34,"Situação",status);y-=40;
  }

  if(y<110)newPage();
  titleBar("Informações complementares");
  const inf=tag(xml,"infAdic"),obs=tag(inf,"infCpl")||tag(xml,"infCpl")||`Situação: ${status}. Protocolo: ${tag(prot,"nProt")||"-"}.`;
  rect(M,y-50,CONTENT,50,white);text(obs,M+5,y-13,6.4,false,CONTENT-10);y-=56;
  text("WS Gestão Contábil · documento auxiliar gerado a partir dos dados fiscais armazenados. Para validade fiscal, prevalecem XML autorizado e protocolo da SEFAZ.",M,24,5.2,false,CONTENT);

  const bytes=await pdf.save();let bin="";for(let i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
  return J({ok:true,pdf_base64:btoa(bin),filename:`${doc.accessKey||doc.nsu||"danfe"}.pdf`,full_xml:full});
 }catch(e){return J({error:e instanceof Error?e.message:String(e)},500)}
});