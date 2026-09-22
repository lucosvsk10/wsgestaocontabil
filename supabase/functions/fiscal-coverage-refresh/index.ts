import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const J=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
const dg=(v:unknown)=>String(v??"").replace(/\D/g,"");

type Row={
  document_type:string;
  direction:"entrada"|"saida"|"eventos";
  applicability:"required"|"observed"|"unknown"|"not_applicable";
  source_name:string|null;
  source_mode:string|null;
  coverage_status:"covered"|"partial"|"blocked"|"error"|"unknown"|"not_applicable";
  source_confirmed:boolean;
  last_verified_at:string|null;
  last_success_at:string|null;
  last_error:string|null;
  details:Record<string,unknown>;
};

Deno.serve(async req=>{
  try{
    const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const {data:t}=await admin.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle();
    if(!t?.token||req.headers.get("x-debug-token")!==String(t.token))return J({error:"unauthorized"},403);

    const body=await req.json().catch(()=>({})) as any;
    const only=String(body.company_id||"");
    const {data:links,error:linkError}=await admin.from("extractor_companies").select("fiscal_company_id").eq("status","active");
    if(linkError)throw linkError;
    const ids=[...new Set((links||[]).map((r:any)=>String(r.fiscal_company_id||"")).filter(Boolean))];
    let q=admin.from("fiscal_companies").select("id,cnpj,razao_social,uf,status,fiscal_settings").in("id",ids).eq("status","ativa").order("razao_social");
    if(only)q=q.eq("id",only);
    const {data:companies,error}=await q;
    if(error)throw error;
    const out:any[]=[];

    for(const company of companies||[]){
      const companyId=String(company.id),uf=String(company.uf||"").toUpperCase(),cnpj=dg(company.cnpj);
      const [purchaseState,salesState,nfseState,stateCred,dfeState,observed,sale55Rec,sp55Rows]=await Promise.all([
        admin.from("fiscal_purchase_sync_state").select("*").eq("company_id",companyId).maybeSingle(),
        admin.from("fiscal_sales_sync_state").select("*").eq("company_id",companyId).maybeSingle(),
        admin.from("fiscal_nfse_sync_state").select("*").eq("company_id",companyId).maybeSingle(),
        admin.from("fiscal_state_credentials").select("last_verification_status,last_verified_at").eq("company_id",companyId).eq("is_active",true).maybeSingle(),
        admin.from("fiscal_dfe_sync_state").select("ult_nsu,max_nsu,last_status_code,last_status_message,last_synced_at").eq("cnpj",cnpj).order("last_synced_at",{ascending:false}).limit(1).maybeSingle(),
        admin.from("fiscal_dfe_documents").select("model,direction,document_kind").eq("company_id",companyId).limit(1000),
        admin.from("fiscal_source_reconciliation").select("status,source_confirmed,source_count,site_count,xml_pending_count,checked_at,reason,details").eq("company_id",companyId).eq("document_type","sale_nfe55").order("checked_at",{ascending:false}).limit(1).maybeSingle(),
        uf==="SP"?admin.from("fiscal_sales_documents").select("access_key,xml,source,updated_at").eq("company_id",companyId).eq("model","55").limit(5000):Promise.resolve({data:[],error:null}),
      ]);
      const ps=purchaseState.data||null,ss=salesState.data||null,ns=nfseState.data||null,cred=stateCred.data||null,ds=dfeState.data||null,s55=sale55Rec.data||null,sp55=sp55Rows.data||[];
      const obs=observed.data||[];
      const seen=(model:string,direction:string)=>obs.some((r:any)=>String(r.model||"")===model&&String(r.direction||"")===direction);
      const now=new Date().toISOString();
      const rows:Row[]=[];

      const purchaseCaughtUp=Boolean(ds?.max_nsu!==null&&String(ds?.ult_nsu||"")===String(ds?.max_nsu||"")&&ps?.status==="idle"&&!ps?.last_error);
      rows.push({
        document_type:"nfe55",direction:"entrada",applicability:"required",
        source_name:"NFeDistribuicaoDFe",source_mode:"national_dfe",
        coverage_status:purchaseCaughtUp?"covered":ps?.last_error?"error":"partial",
        source_confirmed:purchaseCaughtUp,last_verified_at:ds?.last_synced_at||ps?.last_completed_at||null,
        last_success_at:purchaseCaughtUp?(ps?.last_completed_at||ds?.last_synced_at||null):null,
        last_error:purchaseCaughtUp?null:(ps?.last_error||"Distribuição nacional ainda não comprovadamente em dia."),
        details:{ult_nsu:ds?.ult_nsu||null,max_nsu:ds?.max_nsu||null,cstat:ds?.last_status_code||null},
      });

      const credStatus=String(cred?.last_verification_status||"not_configured");
      if(uf==="AL"){
        const ok=credStatus==="valid";
        const sale55Ok=Boolean(ok&&s55?.status==="ok"&&s55?.source_confirmed);
        rows.push({
          document_type:"nfe55",direction:"saida",applicability:"required",
          source_name:"SEFAZ/AL relatório de emitidas",source_mode:"state_portal",
          coverage_status:sale55Ok?"covered":ok?"partial":"blocked",source_confirmed:sale55Ok,
          last_verified_at:s55?.checked_at||cred?.last_verified_at||null,last_success_at:sale55Ok?(s55?.checked_at||null):null,
          last_error:sale55Ok?null:ok?(s55?.reason||"Credencial validada; reconciliação por período ainda precisa concluir."):"Credencial SEFAZ/AL ausente, inválida ou sem permissão.",
          details:{credential_status:credStatus,reconciliation_status:s55?.status||null,source_count:s55?.source_count??null,site_count:s55?.site_count??null,xml_pending_count:s55?.xml_pending_count??null},
        });
        rows.push({
          document_type:"nfce65",direction:"saida",applicability:"required",
          source_name:"SEFAZ/AL + reconciliação NFC-e",source_mode:"state_portal_and_probe",
          coverage_status:ok&&ss?.reconciliation_complete?"covered":ok?"partial":"blocked",
          source_confirmed:Boolean(ok&&ss?.reconciliation_complete),
          last_verified_at:ss?.last_completed_at||cred?.last_verified_at||null,
          last_success_at:ok&&ss?.reconciliation_complete?(ss?.last_completed_at||null):null,
          last_error:ok?(ss?.reconciliation_complete?null:"Reconciliação NFC-e ainda não concluída."):"Credencial SEFAZ/AL não validada.",
          details:{credential_status:credStatus,reconciliation_complete:Boolean(ss?.reconciliation_complete),reconciliation_pending:Number(ss?.reconciliation_pending||0)},
        });
      }else if(uf==="SP"){
        const sp55Known=sp55.length,sp55Xml=sp55.filter((r:any)=>Boolean(r.xml)).length;
        rows.push({
          document_type:"nfe55",direction:"saida",applicability:"required",
          source_name:"NFeDistribuicaoDFe eventos do emitente + SEFAZ/SP Consulta Protocolo",source_mode:"national_events_and_state_status",
          coverage_status:s55?.status==="ok"&&s55?.source_confirmed?"covered":"partial",
          source_confirmed:Boolean(s55?.status==="ok"&&s55?.source_confirmed),
          last_verified_at:s55?.checked_at||ss?.last_completed_at||null,
          last_success_at:s55?.status==="ok"&&s55?.source_confirmed?(s55?.checked_at||null):null,
          last_error:s55?.status==="ok"&&s55?.source_confirmed?null:"As chaves oficiais encontradas são capturadas e validadas, mas a enumeração exaustiva por período ainda não foi comprovada.",
          details:{official_keys_captured:sp55Known,xml_ready:sp55Xml,xml_pending:Math.max(0,sp55Known-sp55Xml),reconciliation_status:s55?.status||null,reason:"issuer_nfe55_exhaustive_enumeration_not_proven"},
        });
        const spOk=Boolean(ss?.status==="idle"&&!ss?.last_error&&ss?.last_completed_at);
        rows.push({
          document_type:"nfce65",direction:"saida",applicability:"required",
          source_name:"SEFAZ/SP SAE-NFC-e",source_mode:"state_webservice",
          coverage_status:spOk?"covered":ss?.last_error?"error":"partial",
          source_confirmed:spOk,last_verified_at:ss?.last_completed_at||null,last_success_at:spOk?ss?.last_completed_at:null,
          last_error:spOk?null:(ss?.last_error||"SAE-NFC-e ainda não concluído."),
          details:{sync_status:ss?.status||null},
        });
      }else{
        rows.push({
          document_type:"nfe55",direction:"saida",applicability:"required",source_name:"Conector estadual de emitidas",source_mode:"state_specific",
          coverage_status:"blocked",source_confirmed:false,last_verified_at:null,last_success_at:null,
          last_error:`Conector de NF-e 55 emitidas ainda não implementado para ${uf||"UF não informada"}.`,details:{uf},
        });
        rows.push({
          document_type:"nfce65",direction:"saida",applicability:"unknown",source_name:"Conector estadual NFC-e",source_mode:"state_specific",
          coverage_status:"unknown",source_confirmed:false,last_verified_at:null,last_success_at:null,
          last_error:"Aplicabilidade e fonte NFC-e ainda não mapeadas para esta UF.",details:{uf},
        });
      }

      const nfseOk=Boolean(ns?.status==="idle"&&!ns?.last_error&&ns?.last_completed_at);
      for(const direction of ["entrada","saida"] as const){
        rows.push({
          document_type:"nfse",direction,applicability:seen("NFS-e",direction)?"observed":"unknown",
          source_name:"ADN NFS-e Nacional",source_mode:"national_nfse",
          coverage_status:nfseOk?"covered":ns?.last_error?"error":"partial",
          source_confirmed:nfseOk,last_verified_at:ns?.last_completed_at||null,last_success_at:nfseOk?ns?.last_completed_at:null,
          last_error:nfseOk?null:(ns?.last_error||"ADN NFS-e ainda não concluído."),
          details:{last_nsu:ns?.last_nsu||null},
        });
      }

      rows.push({
        document_type:"cte57",direction:"entrada",applicability:seen("57","entrada")?"observed":"unknown",
        source_name:"CT-e Distribuição DF-e",source_mode:"national_cte",coverage_status:"blocked",source_confirmed:false,
        last_verified_at:null,last_success_at:null,last_error:"Conector CT-e nacional ainda não implementado no Extrator.",details:{},
      });
      rows.push({
        document_type:"cte57",direction:"saida",applicability:seen("57","saida")?"observed":"unknown",
        source_name:"CT-e emitidos",source_mode:"issuer_cte",coverage_status:"blocked",source_confirmed:false,
        last_verified_at:null,last_success_at:null,last_error:"Conector de CT-e emitidos ainda não implementado no Extrator.",details:{},
      });
      rows.push({
        document_type:"mdfe58",direction:"saida",applicability:seen("58","saida")?"observed":"unknown",
        source_name:"MDF-e emitidos",source_mode:"issuer_mdfe",coverage_status:"blocked",source_confirmed:false,
        last_verified_at:null,last_success_at:null,last_error:"Conector de MDF-e emitidos ainda não implementado no Extrator.",details:{},
      });
      rows.push({
        document_type:"nfe_event",direction:"eventos",applicability:"required",
        source_name:"NFeDistribuicaoDFe eventos",source_mode:"national_dfe",
        coverage_status:purchaseCaughtUp?"covered":"partial",source_confirmed:purchaseCaughtUp,
        last_verified_at:ds?.last_synced_at||null,last_success_at:purchaseCaughtUp?(ds?.last_synced_at||null):null,
        last_error:purchaseCaughtUp?null:"Eventos NF-e acompanham a distribuição nacional ainda pendente.",
        details:{},
      });
      rows.push({
        document_type:"cte_event",direction:"eventos",applicability:"unknown",
        source_name:"Eventos CT-e",source_mode:"national_cte",coverage_status:"blocked",source_confirmed:false,
        last_verified_at:null,last_success_at:null,last_error:"Eventos CT-e ainda sem conector.",details:{},
      });
      rows.push({
        document_type:"mdfe_event",direction:"eventos",applicability:"unknown",
        source_name:"Eventos MDF-e",source_mode:"national_mdfe",coverage_status:"blocked",source_confirmed:false,
        last_verified_at:null,last_success_at:null,last_error:"Eventos MDF-e ainda sem conector.",details:{},
      });

      for(const row of rows){
        const {error}=await admin.from("fiscal_extractor_coverage").upsert({
          company_id:companyId,...row,updated_at:now
        },{onConflict:"company_id,document_type,direction"});
        if(error)throw error;
      }
      const blocking=rows.filter(r=>r.applicability!=="not_applicable"&&r.coverage_status!=="covered");
      out.push({company_id:companyId,name:company.razao_social,uf,complete:blocking.length===0,blocking:blocking.map(r=>({document_type:r.document_type,direction:r.direction,status:r.coverage_status,reason:r.last_error}))});
    }

    return J({ok:true,companies:out});
  }catch(error){
    return J({error:error instanceof Error?error.message:String(error)},500);
  }
});
