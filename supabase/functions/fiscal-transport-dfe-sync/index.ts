import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const J=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
const E=new TextEncoder(),D=new TextDecoder(),B=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const dg=(v:unknown)=>String(v??"").replace(/\D/g,"");
const tag=(xml:string,n:string)=>xml.match(new RegExp(`<(?:\\w+:)?${n}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${n}>`,"i"))?.[1]?.trim()||"";
const attr=(s:string,n:string)=>s.match(new RegExp(`${n}=["']([^"']+)["']`,"i"))?.[1]||"";
const section=(xml:string,n:string)=>tag(xml,n);
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const UF:Record<string,string>={AC:"12",AL:"27",AP:"16",AM:"13",BA:"29",CE:"23",DF:"53",ES:"32",GO:"52",MA:"21",MT:"51",MS:"50",MG:"31",PA:"15",PB:"25",PR:"41",PE:"26",PI:"22",RJ:"33",RN:"24",RS:"43",RO:"11",RR:"14",SC:"42",SP:"35",SE:"28",TO:"17"};

type Family="cte57"|"mdfe58";
type Parsed={
  event:boolean;accessKey:string;model:string;issueDate:string|null;value:number;
  issuerCnpj:string;issuerName:string;recipientCnpj:string;number:string|null;series:string|null;
  statusCode:string|null;statusText:string|null;fullXml:boolean;eventType:string|null;
  eventDescription:string|null;direction:"entrada"|"saida"|"relacionada";xml:string;
};

async function vaultKey(){
  const secret=Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!secret)throw new Error("vault_secret_missing");
  const hash=await crypto.subtle.digest("SHA-256",E.encode(`ws-fiscal-vault:${secret}`));
  return crypto.subtle.importKey("raw",hash,{name:"AES-GCM"},false,["decrypt"]);
}
async function decrypt(cipher:string,iv:string){
  return D.decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:B(iv)},await vaultKey(),B(cipher)));
}
async function gunzip(v:string){
  const bytes=Uint8Array.from(atob(v.replace(/\s/g,"")),c=>c.charCodeAt(0));
  return D.decode(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
}
function companyAppears(xml:string,cnpj:string){
  const roles=["dest","rem","receb","exped","toma3","toma4","toma","infRespTec"];
  return roles.some(role=>dg(tag(section(xml,role),"CNPJ"))===cnpj);
}
function parseTransport(xml:string,schema:string,cnpj:string,family:Family):Parsed{
  const cte=family==="cte57";
  const event=cte
    ? /procEventoCTe|eventoCTe/i.test(schema)||/<(?:\w+:)?eventoCTe\b/i.test(xml)
    : /procEventoMDFe|eventoMDFe/i.test(schema)||/<(?:\w+:)?eventoMDFe\b/i.test(xml);
  const emit=section(xml,"emit");
  const dest=section(xml,"dest");
  const issuerCnpj=dg(tag(emit,"CNPJ"));
  const recipientCnpj=dg(tag(dest,"CNPJ"));
  const accessKey=cte
    ? (tag(xml,"chCTe")||xml.match(/Id=["']CTe(\d{44})["']/i)?.[1]||"")
    : (tag(xml,"chMDFe")||xml.match(/Id=["']MDFe(\d{44})["']/i)?.[1]||"");
  const model=accessKey.length===44?accessKey.slice(20,22):(cte?"57":"58");
  const issueDate=tag(xml,"dhEmi")||tag(xml,"dhEvento")||tag(xml,"dhRegEvento")||null;
  const fullXml=!event&&(cte?/<(?:\w+:)?cteProc\b/i.test(xml):/<(?:\w+:)?mdfeProc\b/i.test(xml));
  const eventType=event?(tag(xml,"tpEvento")||null):null;
  const eventDescription=event?(tag(xml,"descEvento")||tag(xml,"xEvento")||null):null;
  let direction:"entrada"|"saida"|"relacionada"="relacionada";
  if(!event){
    if(issuerCnpj===cnpj)direction="saida";
    else if(cte&&(recipientCnpj===cnpj||companyAppears(xml,cnpj)))direction="entrada";
  }
  return{
    event,accessKey,model,issueDate,
    value:Number(cte?(tag(xml,"vTPrest")||0):(tag(xml,"vCarga")||0)),
    issuerCnpj,issuerName:tag(emit,"xNome")||"",recipientCnpj,
    number:(cte?tag(xml,"nCT"):tag(xml,"nMDF"))||null,
    series:tag(xml,"serie")||null,
    statusCode:(tag(xml,"cStat")||null),
    statusText:eventDescription||(tag(xml,"xMotivo")||null),
    fullXml,eventType,eventDescription,direction,xml
  };
}
async function gateway(token:string,body:any){
  const response=await fetch("https://ws-nfse-sefin-probe.vercel.app/api/fiscal-soap",{
    method:"POST",
    headers:{"content-type":"application/json","authorization":`Bearer ${token}`},
    body:JSON.stringify(body),
    signal:AbortSignal.timeout(70000)
  });
  const payload=await response.json().catch(()=>({})) as any;
  if(!response.ok||!payload?.ok||!payload?.text){
    throw new Error(`gateway_${response.status}:${String(payload?.error||"transport_failed").slice(0,300)}`);
  }
  return String(payload.text);
}
async function saveDocs(admin:any,rows:any[]){
  for(const row of rows){
    const {error}=await admin.from("fiscal_dfe_documents").upsert(row,{onConflict:"user_id,cnpj,environment,uf_code,nsu"});
    if(error)throw error;
  }
}
async function saveEvents(admin:any,rows:any[]){
  for(const row of rows){
    const {error}=await admin.from("fiscal_dfe_events").upsert(row,{onConflict:"user_id,cnpj,environment,uf_code,nsu"});
    if(error)throw error;
  }
}

Deno.serve(async req=>{
  if(req.method!=="POST")return J({error:"method_not_allowed"},405);
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try{
    const [{data:internal},{data:gatewayRow}]=await Promise.all([
      admin.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle(),
      admin.from("_fiscal_vercel_gateway_token").select("token").eq("id",true).maybeSingle(),
    ]);
    if(!internal?.token||req.headers.get("x-debug-token")!==String(internal.token))return J({error:"unauthorized"},403);
    const gatewayToken=String(gatewayRow?.token||"");
    if(!gatewayToken)return J({error:"gateway_token_missing"},500);

    const body=await req.json().catch(()=>({})) as any;
    const only=String(body.company_id||"");
    const families:Family[]=Array.isArray(body.families)
      ? body.families.filter((x:unknown):x is Family=>x==="cte57"||x==="mdfe58")
      : ["cte57","mdfe58"];
    if(!families.length)return J({error:"invalid_families"},400);
    const maxCompanies=only?1:Math.min(6,Math.max(1,Number(body.limit||2)));
    const maxBatches=Math.min(8,Math.max(1,Number(body.max_batches||4)));

    const [{data:links},{data:historyStart}]=await Promise.all([
      admin.from("extractor_companies").select("fiscal_company_id").eq("status","active"),
      admin.rpc("extractor_minimum_history_start"),
    ]);
    const ids=[...new Set((links||[]).map((x:any)=>String(x.fiscal_company_id||"")).filter(Boolean))];
    if(only&&!ids.includes(only))return J({error:"company_not_active_in_extractor"},422);
    let companyQuery=admin.from("fiscal_companies")
      .select("id,cnpj,razao_social,uf,ambiente_padrao,status,created_by")
      .in("id",only?[only]:ids).eq("status","ativa").order("last_sync_at",{ascending:true,nullsFirst:true});
    if(!only)companyQuery=companyQuery.limit(maxCompanies);
    const {data:companies,error:companyError}=await companyQuery;
    if(companyError)throw companyError;

    const out:any[]=[];
    const minDate=/^\d{4}-\d{2}-\d{2}$/.test(String(historyStart||""))?String(historyStart):"";
    for(const company of companies||[]){
      const companyId=String(company.id),cnpj=dg(company.cnpj),ufCode=UF[String(company.uf||"").toUpperCase()]||"27";
      const environment=company.ambiente_padrao==="homologacao"?"homologacao":"producao";
      const {data:cert}=await admin.from("fiscal_certificates")
        .select("certificate_ciphertext,certificate_iv,password_ciphertext,password_iv,valid_until")
        .eq("company_id",companyId).eq("is_active",true).order("created_at",{ascending:false}).limit(1).maybeSingle();
      if(!cert){out.push({company_id:companyId,name:company.razao_social,status:"waiting_certificate"});continue}
      if(cert.valid_until&&new Date(cert.valid_until)<new Date()){out.push({company_id:companyId,name:company.razao_social,status:"certificate_expired"});continue}
      const pfx=await decrypt(cert.certificate_ciphertext,cert.certificate_iv);
      const password=await decrypt(cert.password_ciphertext,cert.password_iv);
      const companyResult:any={company_id:companyId,name:company.razao_social,families:{}};

      for(const family of families){
        const {data:state}=await admin.from("fiscal_transport_sync_state").select("*")
          .eq("company_id",companyId).eq("document_family",family).eq("environment",environment).maybeSingle();
        const now=new Date();
        if(state?.cooldown_until&&!body.force&&new Date(state.cooldown_until)>now){
          companyResult.families[family]={status:"cooldown",cooldown_until:state.cooldown_until};
          continue;
        }
        let current=dg(state?.ult_nsu||"0").padStart(15,"0").slice(-15);
        let max=dg(state?.max_nsu||current).padStart(15,"0").slice(-15);
        let lastCode="",lastMessage="",saved=0,eventsSaved=0,batches=0,skippedOlder=0;
        let familyError:string|null=null;
        try{
          for(let i=0;i<maxBatches;i++){
            if(i)await sleep(1300);
            const raw=await gateway(gatewayToken,{
              action:family==="cte57"?"cte-distribution":"mdfe-distribution",
              environment:environment==="homologacao"?"homologation":"production",
              certificate_base64:pfx,certificate_password:password,
              cnpj,uf_code:ufCode,ult_nsu:current
            });
            lastCode=tag(raw,"cStat");
            lastMessage=tag(raw,"xMotivo");
            const abuse=(family==="cte57"&&lastCode==="656")||(family==="mdfe58"&&(lastCode==="678"||lastCode==="656"));
            if(abuse){
              const cooldown=new Date(Date.now()+65*60000).toISOString();
              await admin.from("fiscal_transport_sync_state").upsert({
                company_id:companyId,document_family:family,environment,ult_nsu:current,max_nsu:max,
                last_status_code:lastCode,last_status_message:lastMessage,last_synced_at:new Date().toISOString(),
                cooldown_until:cooldown,last_error:`${family} ${lastCode}: ${lastMessage||"consumo indevido"}`,updated_at:new Date().toISOString()
              },{onConflict:"company_id,document_family,environment"});
              familyError=`official_service_${lastCode}`;
              break;
            }
            if(!["137","138"].includes(lastCode)){
              throw new Error(`official_service_${lastCode||"unknown"}:${lastMessage||"unexpected_response"}`);
            }

            const parsed:any[]=[];
            const re=/<docZip\b([^>]*)>([\s\S]*?)<\/docZip>/gi;
            let match:RegExpExecArray|null;
            while((match=re.exec(raw))){
              try{
                const rawNsu=attr(match[1],"NSU");
                const schema=attr(match[1],"schema");
                const xml=await gunzip(match[2]);
                parsed.push({rawNsu,schema,...parseTransport(xml,schema,cnpj,family)});
              }catch(error){console.error("transport_doczip_parse",family,error)}
            }

            const docs=parsed.filter(x=>!x.event&&(!minDate||!x.issueDate||String(x.issueDate).slice(0,10)>=minDate));
            const evs=parsed.filter(x=>x.event&&(!minDate||!x.issueDate||String(x.issueDate).slice(0,10)>=minDate));
            skippedOlder+=parsed.length-docs.length-evs.length;
            const source=family==="cte57"?"national_cte":"national_mdfe";
            const prefix=family==="cte57"?"CTE":"MDFE";

            if(docs.length){
              await saveDocs(admin,docs.map(x=>({
                user_id:company.created_by,company_id:companyId,cnpj,environment,uf_code:ufCode,
                nsu:`${prefix}:${String(x.rawNsu).padStart(15,"0")}`,
                source,source_id:String(x.rawNsu),schema_name:x.schema,document_kind:"documento",
                direction:x.direction,access_key:x.accessKey||null,model:x.model,
                issue_date:x.issueDate,value:x.value,issuer_cnpj:x.issuerCnpj||null,issuer_name:x.issuerName||null,
                recipient_cnpj:x.recipientCnpj||null,note_number:x.number,series:x.series,
                status_code:x.statusCode,status_text:x.statusText,full_xml:x.fullXml,xml:x.xml,
                parse_error:null,updated_at:new Date().toISOString()
              })));
              saved+=docs.length;
            }
            if(evs.length){
              await saveEvents(admin,evs.map(x=>({
                user_id:company.created_by,company_id:companyId,cnpj,environment,uf_code:ufCode,
                nsu:`${prefix}:${String(x.rawNsu).padStart(15,"0")}`,
                schema_name:x.schema,access_key:x.accessKey||null,event_type:x.eventType,
                event_description:x.eventDescription,status_code:x.statusCode,event_at:x.issueDate,
                xml:x.xml,source,updated_at:new Date().toISOString()
              })));
              for(const x of evs){
                if(x.accessKey&&/cancel/i.test(String(x.eventDescription||""))){
                  await admin.from("fiscal_dfe_documents").update({
                    status_code:"101",status_text:"Cancelado",updated_at:new Date().toISOString()
                  }).eq("company_id",companyId).eq("access_key",x.accessKey);
                }
              }
              eventsSaved+=evs.length;
            }

            const next=dg(tag(raw,"ultNSU")||current).padStart(15,"0").slice(-15);
            max=dg(tag(raw,"maxNSU")||next).padStart(15,"0").slice(-15);
            current=next;batches++;
            const complete=lastCode==="137"||current>=max;
            const cooldown=complete?new Date(Date.now()+65*60000).toISOString():null;
            await admin.from("fiscal_transport_sync_state").upsert({
              company_id:companyId,document_family:family,environment,ult_nsu:current,max_nsu:max,
              last_status_code:lastCode,last_status_message:lastMessage,last_synced_at:new Date().toISOString(),
              last_completed_at:complete?new Date().toISOString():state?.last_completed_at||null,
              cooldown_until:cooldown,last_error:null,updated_at:new Date().toISOString()
            },{onConflict:"company_id,document_family,environment"});
            if(complete)break;
          }
        }catch(error){
          familyError=error instanceof Error?error.message:String(error);
          await admin.from("fiscal_transport_sync_state").upsert({
            company_id:companyId,document_family:family,environment,ult_nsu:current,max_nsu:max,
            last_status_code:lastCode||null,last_status_message:lastMessage||null,last_synced_at:new Date().toISOString(),
            cooldown_until:new Date(Date.now()+15*60000).toISOString(),last_error:familyError,updated_at:new Date().toISOString()
          },{onConflict:"company_id,document_family,environment"});
        }
        companyResult.families[family]={
          status:familyError?"error":(current>=max||lastCode==="137"?"caught_up":"progress"),
          cStat:lastCode||null,ult_nsu:current,max_nsu:max,new_documents:saved,new_events:eventsSaved,
          skipped_older:skippedOlder,error:familyError
        };
      }
      out.push(companyResult);
    }
    return J({ok:true,companies:out});
  }catch(error){
    console.error("fiscal-transport-dfe-sync",error);
    return J({error:error instanceof Error?error.message:String(error)},500);
  }
});
