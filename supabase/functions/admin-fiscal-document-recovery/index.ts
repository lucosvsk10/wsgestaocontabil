import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"content-type":"application/json","cache-control":"no-store"}});
const windowStart=()=>{const n=new Date();return new Date(Date.UTC(n.getUTCFullYear(),n.getUTCMonth()-1,1,3,0,0,0)).toISOString()};
const terminal=new Set(['ready','requires_manifestation','failed']);

function previewDoc(doc:any){return {
  companyId:doc.company_id,nsu:doc.nsu,schema:doc.schema_name,documentKind:doc.document_kind,fullXml:doc.full_xml,
  direction:doc.direction,accessKey:doc.access_key,issueDate:doc.issue_date,value:doc.value,issuerCnpj:doc.issuer_cnpj,
  issuerName:doc.issuer_name,recipientCnpj:doc.recipient_cnpj,number:doc.note_number,series:doc.series,statusCode:doc.status_code,
  statusText:doc.status_text,model:doc.model,xml:doc.xml,parseError:doc.parse_error
}}

async function authAdmin(admin:any,req:Request){
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
  if(!token) return {error:json({error:'Não autenticado'},401)};
  const {data}=await admin.auth.getUser(token);
  if(!data.user) return {error:json({error:'Não autenticado'},401)};
  const {data:role}=await admin.from('user_roles').select('role').eq('user_id',data.user.id).eq('role','admin').maybeSingle();
  if(!role) return {error:json({error:'Acesso exclusivo para administradores'},403)};
  return {user:data.user,token};
}

async function loadRun(admin:any,userId:string,runId?:string){
  let q=admin.from('fiscal_document_recovery_runs').select('*').eq('requested_by',userId);
  if(runId) q=q.eq('id',runId); else q=q.order('created_at',{ascending:false}).limit(1);
  const {data:run,error}=await q.maybeSingle(); if(error) throw error;
  if(!run) return {run:null,items:[]};
  const {data:items,error:ie}=await admin.from('fiscal_document_recovery_items').select('*').eq('run_id',run.id).order('position',{ascending:true});
  if(ie) throw ie;
  const companyIds=[...new Set((items||[]).map((x:any)=>String(x.company_id)).filter(Boolean))];
  const {data:companies}=companyIds.length?await admin.from('fiscal_companies').select('id,razao_social,nome_fantasia,cnpj').in('id',companyIds):{data:[]};
  const byCompany=new Map((companies||[]).map((c:any)=>[String(c.id),c]));
  return {run,items:(items||[]).map((x:any)=>({...x,company:byCompany.get(String(x.company_id))||null}))};
}

async function refreshRun(admin:any,runId:string){
  const {data:items,error}=await admin.from('fiscal_document_recovery_items').select('status').eq('run_id',runId); if(error) throw error;
  const rows=items||[]; const total=rows.length; const ready=rows.filter((x:any)=>x.status==='ready').length;
  const requires=rows.filter((x:any)=>x.status==='requires_manifestation').length; const failed=rows.filter((x:any)=>x.status==='failed').length;
  const processed=rows.filter((x:any)=>terminal.has(x.status)).length; const active=rows.some((x:any)=>['queued','searching_xml','generating_danfe','retry'].includes(x.status));
  const status=active?'running':(ready===total?'completed':'partial');
  const patch:any={total,processed,ready,requires_manifestation:requires,failed,status,updated_at:new Date().toISOString()};
  if(!active) patch.finished_at=new Date().toISOString();
  const {error:ue}=await admin.from('fiscal_document_recovery_runs').update(patch).eq('id',runId); if(ue) throw ue;
}

async function callFunction(base:string,name:string,authHeader:string,body:any){
  const r=await fetch(`${base}/functions/v1/${name}`,{method:'POST',headers:{'content-type':'application/json','authorization':authHeader},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
  let payload:any={}; try{payload=await r.json()}catch{}
  return {status:r.status,ok:r.ok,payload};
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS') return new Response(null,{headers:cors});
  if(req.method!=='POST') return json({error:'Método não permitido'},405);
  try{
    const url=Deno.env.get('SUPABASE_URL'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!url||!service) return json({error:'Configuração ausente'},500);
    const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const auth=await authAdmin(admin,req); if(auth.error) return auth.error;
    const user=auth.user!,token=auth.token!; const authHeader=`Bearer ${token}`;
    const body=await req.json().catch(()=>({})) as any; const action=String(body.action||'status');

    if(action==='status') return json({ok:true,...await loadRun(admin,user.id,body.run_id?String(body.run_id):undefined)});

    if(action==='start'){
      const {data:active}=await admin.from('fiscal_document_recovery_runs').select('id').eq('requested_by',user.id).eq('status','running').order('created_at',{ascending:false}).limit(1).maybeSingle();
      if(active?.id) return json({ok:true,resumed:true,...await loadRun(admin,user.id,active.id)});
      const start=windowStart(),end=new Date().toISOString();
      const {data:docs,error:de}=await admin.from('fiscal_dfe_documents')
        .select('id,company_id,access_key,nsu,note_number,series,model,direction,issue_date,full_xml,xml,parse_error,document_kind')
        .gte('issue_date',start).lte('issue_date',end).neq('document_kind','evento')
        .order('issue_date',{ascending:false}).order('created_at',{ascending:false});
      if(de) throw de;
      const pending=(docs||[]).filter((d:any)=>!(d.full_xml&&d.xml));
      const {data:run,error:re}=await admin.from('fiscal_document_recovery_runs').insert({requested_by:user.id,status:pending.length?'running':'completed',window_start:start,window_end:end,total:pending.length,finished_at:pending.length?null:new Date().toISOString()}).select('*').single();
      if(re) throw re;
      if(pending.length){
        const items=pending.map((d:any,i:number)=>({run_id:run.id,company_id:d.company_id,document_id:d.id,access_key:d.access_key,note_number:d.note_number,series:d.series,model:d.model,direction:d.direction,issue_date:d.issue_date,position:i+1,status:'queued',message:d.parse_error?`Pendente: ${d.parse_error}`:'Aguardando busca'}));
        const {error:ie}=await admin.from('fiscal_document_recovery_items').insert(items); if(ie) throw ie;
      }
      return json({ok:true,...await loadRun(admin,user.id,run.id)});
    }

    if(action==='step'){
      const runId=String(body.run_id||''); if(!runId) return json({error:'run_id obrigatório'},400);
      const loaded=await loadRun(admin,user.id,runId); if(!loaded.run) return json({error:'Busca não encontrada'},404);
      if(loaded.run.status!=='running') return json({ok:true,...loaded});
      const next=(loaded.items as any[]).find(x=>x.status==='queued'||x.status==='retry');
      if(!next){await refreshRun(admin,runId);return json({ok:true,...await loadRun(admin,user.id,runId)});}
      const attempts=Number(next.attempts||0)+1,now=new Date().toISOString();
      await admin.from('fiscal_document_recovery_items').update({status:'searching_xml',message:'Buscando XML oficial',attempts,started_at:next.started_at||now,updated_at:now}).eq('id',next.id);
      const {data:doc,error:docError}=await admin.from('fiscal_dfe_documents').select('*').eq('id',next.document_id).maybeSingle();
      if(docError||!doc){await admin.from('fiscal_document_recovery_items').update({status:'failed',message:'Documento não encontrado no banco',finished_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',next.id);await refreshRun(admin,runId);return json({ok:true,...await loadRun(admin,user.id,runId)});}
      let readyDoc=doc;
      if(!(doc.full_xml&&doc.xml)){
        const recovery=await callFunction(url,'fiscal-document-recover',authHeader,{company_id:doc.company_id,access_key:doc.access_key,nsu:doc.nsu});
        if(recovery.payload?.ready&&recovery.payload?.document){readyDoc=recovery.payload.document;}
        else if(recovery.payload?.requires_manifestation){
          await admin.from('fiscal_document_recovery_items').update({status:'requires_manifestation',message:recovery.payload?.reason||'SEFAZ exige manifestação do destinatário',finished_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',next.id);
          await refreshRun(admin,runId);return json({ok:true,...await loadRun(admin,user.id,runId)});
        }else{
          const canRetry=Boolean(recovery.payload?.retryable)&&attempts<2; const status=canRetry?'retry':'failed';
          await admin.from('fiscal_document_recovery_items').update({status,message:recovery.payload?.reason||recovery.payload?.error||`Falha ao recuperar XML (HTTP ${recovery.status})`,finished_at:canRetry?null:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',next.id);
          await refreshRun(admin,runId);return json({ok:true,...await loadRun(admin,user.id,runId)});
        }
      }
      await admin.from('fiscal_document_recovery_items').update({status:'generating_danfe',message:'XML obtido. Validando DANFE',updated_at:new Date().toISOString()}).eq('id',next.id);
      const latest=(await admin.from('fiscal_dfe_documents').select('*').eq('id',next.document_id).maybeSingle()).data||readyDoc;
      const pdf=await callFunction(url,'dfe-danfe-pdf',authHeader,{company_id:latest.company_id,document:previewDoc(latest)});
      const pdfOk=Boolean(pdf.ok&&pdf.payload?.pdf_base64);
      if(pdfOk){
        await admin.from('fiscal_document_recovery_items').update({status:'ready',message:'XML integral e DANFE disponíveis',pdf_verified:true,finished_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',next.id);
      }else{
        const canRetry=attempts<2; await admin.from('fiscal_document_recovery_items').update({status:canRetry?'retry':'failed',message:pdf.payload?.error||`XML obtido, mas o DANFE não pôde ser validado (HTTP ${pdf.status})`,pdf_verified:false,finished_at:canRetry?null:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',next.id);
      }
      await refreshRun(admin,runId); return json({ok:true,...await loadRun(admin,user.id,runId)});
    }

    return json({error:'Ação inválida'},400);
  }catch(e){console.error('admin-fiscal-document-recovery',e);return json({error:e instanceof Error?e.message:String(e)},500)}
});