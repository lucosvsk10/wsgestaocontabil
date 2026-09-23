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
    let q=admin.from("fiscal_companies").select("id,cnpj,razao_social,uf,ambiente_padrao,status,fiscal_settings").in("id",ids).eq("status","ativa").order("razao_social");
    if(only)q=q.eq("id",only);
    const {data:companies,error}=await q;
    if(error)throw error;
    const out:any[]=[];

    for(const company of companies||[]){
      const companyId=String(company.id),uf=String(company.uf||"").toUpperCase(),cnpj=dg(company.cnpj);
      const [purchaseState,salesState,nfseState,stateCred,dfeState,cteState,mdfeState,observed,sale55Rec,sp55Rows]=await Promise.all([
        admin.from("fiscal_purchase_sync_state").select("*").eq("company_id",companyId).maybeSingle(),
        admin.from("fiscal_sales_sync_state").select("*").eq("company_id",companyId).maybeSingle(),
        admin.from("fiscal_nfse_sync_state").select("*").eq("company_id",companyId).maybeSingle(),
        admin.from("fiscal_state_credentials").select("last_verification_status,last_verified_at").eq("company_id",companyId).eq("is_active",true).maybeSingle(),
        admin.from("fiscal_dfe_sync_state").select("ult_nsu,max_nsu,last_status_code,last_status_message,last_synced_at").eq("cnpj",cnpj).order("last_synced_at",{ascending:false}).limit(1).maybeSingle(),
        admin.from("fiscal_transport_sync_state").select("*").eq("company_id",companyId).eq("document_family","cte57").eq("environment",company.ambiente_padrao==="homologacao"?"homologacao":"producao").maybeSingle(),
        admin.from("fiscal_transport_sync_state").select("*").eq("company_id",companyId).eq("document_family","mdfe58").eq("environment",company.ambiente_padrao==="homologacao"?"homologacao":"producao").maybeSingle(),
        admin.from("fiscal_dfe_documents").select("model,direction,document_kind").eq("company_id",companyId).limit(1000),
        admin.from("fiscal_source_reconciliation").select("status,source_confirmed,source_count,site_count,xml_pending_count,checked_at,reason,details").eq("company_id",companyId).eq("document_type","sale_nfe55").order("checked_at",{ascending:false}).limit(1).maybeSingle(),
        uf==="SP"?admin.from("fiscal_sales_documents").select("access_key,xml,source,updated_at").eq("company_id",companyId).eq("model","55").limit(5000):Promise.resolve({data:[],error:null}),
      ]);
      const ps=purchaseState.data||null,ss=salesState.data||null,ns=nfseState.data||null,cred=stateCred.data||null,ds=dfeState.data||null,cts=cteState.data||null,mds=mdfeState.data||null,s55=sale55Rec.data||null,sp55=sp55Rows.data||[];
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
        const loginUsable=["valid","valid_without_report_permission"].includes(credStatus);
        const reportPermission=credStatus==="valid";
        const sale55Ok=Boolean(s55?.status==="ok"&&s55?.source_confirmed);
        rows.push({
          document_type:"nfe55",direction:"saida",applicability:"required",
          source_name:"SEFAZ/AL relatório de emitidas + reconciliação A1/SVRS",source_mode:"state_portal_or_a1_recovery",
          coverage_status:sale55Ok?"covered":loginUsable?"partial":"blocked",source_confirmed:sale55Ok,
          last_verified_at:s55?.checked_at||cred?.last_verified_at||null,last_success_at:sale55Ok?(s55?.checked_at||null):null,
          last_error:sale55Ok?null:reportPermission
            ?(s55?.reason||"Credencial validada; reconciliação por período ainda precisa concluir.")
            :loginUsable
              ?"Login estadual válido, mas o relatório de NF-e emitidas não foi liberado para este usuário. A recuperação por A1 continua como fallback."
              :"Credencial SEFAZ/AL ausente ou inválida.",
          details:{credential_status:credStatus,report_permission:reportPermission,reconciliation_status:s55?.status||null,source_count:s55?.source_count??null,site_count:s55?.site_count??null,xml_pending_count:s55?.xml_pending_count??null},
        });
        const nfceComplete=Boolean(ss?.reconciliation_complete&&Number(ss?.reconciliation_pending||0)===0&&!ss?.last_error);
        rows.push({
          document_type:"nfce65",direction:"saida",applicability:"required",
          source_name:"SVRS/SEFAZ NFC-e reconciliation",source_mode:"a1_sequence",
          coverage_status:nfceComplete?"covered":ss?.last_error?"partial":"partial",
          source_confirmed:nfceComplete,
          last_verified_at:ss?.last_completed_at||null,
          last_success_at:nfceComplete?(ss?.last_completed_at||null):null,
          last_error:nfceComplete?null:(ss?.last_error||"Reconciliação NFC-e ainda não concluída."),
          details:{credential_status:credStatus,portal_required:false,reconciliation_complete:Boolean(ss?.reconciliation_complete),reconciliation_pending:Number(ss?.reconciliation_pending||0)},
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
        const spNfceOk=Boolean(ss?.nfce_source_status==="ok"&&ss?.nfce_source_confirmed_at);
        rows.push({
          document_type:"nfce65",direction:"saida",applicability:"required",
          source_name:"SEFAZ/SP SAE-NFC-e",source_mode:"state_webservice",
          coverage_status:spNfceOk?"covered":ss?.nfce_source_error?"error":"partial",
          source_confirmed:spNfceOk,
          last_verified_at:ss?.nfce_source_confirmed_at||null,
          last_success_at:spNfceOk?(ss?.nfce_source_confirmed_at||null):null,
          last_error:spNfceOk?null:(ss?.nfce_source_error||"SAE-NFC-e ainda não concluído."),
          details:{
            source_status:ss?.nfce_source_status||null,
            source_count:ss?.nfce_source_count??null,
            source_period_start:ss?.nfce_source_period_start||null,
            source_period_end:ss?.nfce_source_period_end||null
          },
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

      const cteCaughtUp=Boolean(cts?.last_completed_at&&!cts?.last_error&&String(cts?.ult_nsu||"")===String(cts?.max_nsu||"")&&["137","138"].includes(String(cts?.last_status_code||"")));
      const mdfeCaughtUp=Boolean(mds?.last_completed_at&&!mds?.last_error&&String(mds?.ult_nsu||"")===String(mds?.max_nsu||"")&&["137","138"].includes(String(mds?.last_status_code||"")));
      rows.push({
        document_type:"cte57",direction:"entrada",applicability:seen("57","entrada")?"observed":"unknown",
        source_name:"CTeDistribuicaoDFe",source_mode:"national_cte",
        coverage_status:cteCaughtUp?"covered":cts?.last_error?"error":"partial",source_confirmed:cteCaughtUp,
        last_verified_at:cts?.last_synced_at||null,last_success_at:cteCaughtUp?(cts?.last_completed_at||cts?.last_synced_at||null):null,
        last_error:cteCaughtUp?null:(cts?.last_error||"Distribuição nacional de CT-e ainda não comprovadamente em dia."),
        details:{ult_nsu:cts?.ult_nsu||null,max_nsu:cts?.max_nsu||null,cstat:cts?.last_status_code||null,scope:"documentos de interesse do ator; CT-e próprios do emitente não são enumerados por este serviço"},
      });
      rows.push({
        document_type:"cte57",direction:"saida",applicability:seen("57","saida")?"observed":"unknown",
        source_name:"CT-e emitidos",source_mode:"issuer_cte",coverage_status:"blocked",source_confirmed:false,
        last_verified_at:cts?.last_synced_at||null,last_success_at:null,
        last_error:"CTeDistribuicaoDFe não enumera os CT-e gerados pelo próprio emitente; falta fonte oficial exaustiva de emitidos.",
        details:{national_distribution_caught_up:cteCaughtUp,reason:"issuer_cte_exhaustive_enumeration_not_available"},
      });
      rows.push({
        document_type:"mdfe58",direction:"saida",applicability:seen("58","saida")?"observed":"unknown",
        source_name:"MDF-e emitidos",source_mode:"issuer_mdfe",coverage_status:"blocked",source_confirmed:false,
        last_verified_at:mds?.last_synced_at||null,last_success_at:null,
        last_error:"MDFeDistribuicaoDFe não enumera os MDF-e gerados pelo próprio emitente; falta fonte oficial exaustiva de emitidos.",
        details:{national_distribution_caught_up:mdfeCaughtUp,reason:"issuer_mdfe_exhaustive_enumeration_not_available"},
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
        document_type:"cte_event",direction:"eventos",applicability:obs.some((r:any)=>String(r.model||"")==="57")?"observed":"unknown",
        source_name:"CTeDistribuicaoDFe eventos",source_mode:"national_cte",
        coverage_status:cteCaughtUp?"covered":cts?.last_error?"error":"partial",source_confirmed:cteCaughtUp,
        last_verified_at:cts?.last_synced_at||null,last_success_at:cteCaughtUp?(cts?.last_completed_at||cts?.last_synced_at||null):null,
        last_error:cteCaughtUp?null:(cts?.last_error||"Eventos de interesse do CT-e ainda não estão em dia."),
        details:{scope:"eventos distribuídos ao ator pelo Ambiente Nacional"},
      });
      rows.push({
        document_type:"mdfe_event",direction:"eventos",applicability:"unknown",
        source_name:"MDFeDistribuicaoDFe eventos",source_mode:"national_mdfe",
        coverage_status:mdfeCaughtUp?"covered":mds?.last_error?"error":"partial",source_confirmed:mdfeCaughtUp,
        last_verified_at:mds?.last_synced_at||null,last_success_at:mdfeCaughtUp?(mds?.last_completed_at||mds?.last_synced_at||null):null,
        last_error:mdfeCaughtUp?null:(mds?.last_error||"Eventos MDF-e distribuídos ao ator ainda não estão em dia."),
        details:{scope:"eventos/documentos de interesse; emissão própria continua em fonte separada"},
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
