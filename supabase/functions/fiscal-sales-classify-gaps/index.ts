import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import pdf from "npm:pdf-parse@1.1.1";
import { Buffer } from "node:buffer";

const E=new TextEncoder(),D=new TextDecoder(),B=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{'content-type':'application/json'}});
async function K(){const s=Deno.env.get('ACCOUNTING_ENGINE_SESSION_SECRET')||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!s)throw new Error('secret_missing');const d=await crypto.subtle.digest('SHA-256',E.encode(`ws-fiscal-vault:${s}`));return crypto.subtle.importKey('raw',d,{name:'AES-GCM'},false,['decrypt'])}
async function dec(c:string,iv:string){return D.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:B(iv)},await K(),B(c)))}
function parseRanges(text:string){const out:{start:number,end:number,reason:string}[]=[];for(const line of String(text||'').split(/\n+/)){const m=line.trim().match(/^(\d+)\s*-\s*(\d+)\s*(.*)$/);if(!m)continue;const start=Number(m[1]),end=Number(m[2]);if(start>0&&end>=start)out.push({start,end,reason:(m[3]||'').trim()})}return out}
async function exactCount(admin:any,companyId:string,latest:number,status:string){const {count,error}=await admin.from('fiscal_sales_reconciliation').select('*',{count:'exact',head:true}).eq('company_id',companyId).eq('model','65').eq('series','1').lte('note_number',latest).eq('status',status);if(error)throw error;return Number(count||0)}
async function fetchReport(gatewayToken:string,user:string,pass:string,cnpj:string){
 const r=await fetch('https://ws-nfse-sefin-probe.vercel.app/api/sefaz-al-report',{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${gatewayToken}`},body:JSON.stringify({username:user,password:pass,cnpj}),signal:AbortSignal.timeout(60000)});
 const o=await r.json().catch(()=>({})) as any;
 if(!r.ok||!o?.ok)throw new Error(`gateway_report_${r.status}:${String(o?.error||'unknown').slice(0,160)}`);
 const base64=String(o?.pdf_base64||'');if(!base64)throw new Error('gateway_report_empty');
 return Buffer.from(base64,'base64');
}

Deno.serve(async req=>{try{
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 const tok=req.headers.get('x-debug-token')||'';
 const [{data:t},{data:g}]=await Promise.all([
  admin.from('_fiscal_sales_debug_token').select('token').eq('id',true).maybeSingle(),
  admin.from('_fiscal_vercel_gateway_token').select('token').eq('id',true).maybeSingle(),
 ]);
 if(!tok||tok!==String(t?.token||''))return json({error:'unauthorized'},403);
 const gatewayToken=String(g?.token||'');if(!gatewayToken)return json({error:'gateway_token_missing'},500);
 const b=await req.json().catch(()=>({})) as any,companyId=String(b.company_id||'');
 const {data:company,error:ce}=await admin.from('fiscal_companies').select('cnpj').eq('id',companyId).single();if(ce||!company)throw new Error('company_missing');
 const {data:state}=await admin.from('fiscal_sales_sync_state').select('latest_number').eq('company_id',companyId).maybeSingle();const latest=Number(state?.latest_number||0);if(!latest)throw new Error('latest_number_missing');
 const {data:c,error}=await admin.from('fiscal_state_credentials').select('username_ciphertext,username_iv,password_ciphertext,password_iv').eq('company_id',companyId).eq('uf','AL').eq('is_active',true).single();if(error||!c)throw new Error('credential_missing');
 const user=await dec(c.username_ciphertext,c.username_iv),pass=await dec(c.password_ciphertext,c.password_iv),target=String(company.cnpj||'').replace(/\D/g,'');
 const bytes=await fetchReport(gatewayToken,user,pass,target),parsed=await pdf(bytes),ranges=parseRanges(String(parsed.text||'').replace(/\r/g,''));
 const official=new Map<number,string>();for(const rg of ranges)for(let n=Math.max(1,rg.start);n<=Math.min(latest,rg.end);n++)official.set(n,rg.reason);
 const {data:gaps,error:ge}=await admin.from('fiscal_sales_reconciliation').select('note_number,status').eq('company_id',companyId).eq('model','65').eq('series','1').lte('note_number',latest).in('status',['not_found','not_authorized']).limit(5000);if(ge)throw ge;
 const now=new Date().toISOString();let inutilizedChanged=0,notAuthorizedChanged=0;
 for(const gap of gaps||[]){const n=Number(gap.note_number),reason=official.get(n);if(reason===undefined)continue;const {error:ue}=await admin.from('fiscal_sales_reconciliation').update({status:'inutilized',cstat:'PORTAL_INUTILIZACAO',xmotivo:`Inutilização confirmada no relatório oficial SEFAZ/AL${reason?` · ${reason}`:''}`,resolved_at:now,last_checked_at:now,updated_at:now}).eq('company_id',companyId).eq('model','65').eq('series','1').eq('note_number',n).in('status',['not_found','not_authorized']);if(ue)throw ue;inutilizedChanged++}
 const {data:residual,error:re}=await admin.from('fiscal_sales_reconciliation').select('note_number').eq('company_id',companyId).eq('model','65').eq('series','1').lte('note_number',latest).eq('status','not_found').limit(5000);if(re)throw re;
 for(const gap of residual||[]){const {error:ue}=await admin.from('fiscal_sales_reconciliation').update({status:'not_authorized',cstat:'SEFAZ_NO_AUTHORIZATION',xmotivo:'Numeração sem documento autorizado: não consta como NF-e/NFC-e na SEFAZ e não consta no relatório oficial de inutilização da SEFAZ/AL após varredura de todas as competências configuradas.',resolved_at:now,last_checked_at:now,updated_at:now}).eq('company_id',companyId).eq('model','65').eq('series','1').eq('note_number',gap.note_number).eq('status','not_found');if(ue)throw ue;notAuthorizedChanged++}
 const officialNums=[...official.keys()];let conflicts:any[]=[];if(officialNums.length){const {data:cf}=await admin.from('fiscal_sales_reconciliation').select('note_number,status').eq('company_id',companyId).eq('model','65').eq('series','1').in('note_number',officialNums).in('status',['found','cancelled']).limit(5000);conflicts=(cf||[]).map((x:any)=>({note_number:x.note_number,status:x.status,reason:official.get(Number(x.note_number))||''}))}
 const [pending,found,cancelled,inutilized,notAuthorized,notFound,errors]=await Promise.all(['pending','found','cancelled','inutilized','not_authorized','not_found','error'].map(s=>exactCount(admin,companyId,latest,s)));
 const resolved=found+cancelled+inutilized+notAuthorized+notFound,complete=resolved===latest&&pending===0&&errors===0;
 await admin.from('fiscal_sales_sync_state').update({reconciliation_total:latest,reconciliation_resolved:resolved,reconciliation_found:found,reconciliation_missing:notFound,reconciliation_cancelled:cancelled,reconciliation_inutilized:inutilized,reconciliation_not_authorized:notAuthorized,reconciliation_pending:pending+errors,reconciliation_complete:complete,status:complete?'idle':'reconciling',reconciliation_completed_at:complete?now:null,updated_at:now}).eq('company_id',companyId);
 return json({ok:true,inutilized_changed:inutilizedChanged,not_authorized_changed:notAuthorizedChanged,official_ranges:ranges.length,counts:{pending,found,cancelled,inutilized,not_authorized:notAuthorized,not_found:notFound,error:errors},complete,conflicts,transport:'vercel-node'});
}catch(e){return json({error:e instanceof Error?e.message:String(e)},500)}});
