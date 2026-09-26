// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { describe,it,expect,vi } from 'vitest';
const code=ts.transpileModule(readFileSync('supabase/functions/fiscal-sales-cron/index.ts','utf8').replace(/^import[^\n]+\n/gm,''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
function setup({certificate=true,paused=false}={}) {
 let handler:any;const writes=vi.fn();const fetch=vi.fn();
 const client={rpc:(name:string)=>Promise.resolve({data:name==='extractor_minimum_history_start'?'2026-01-01':'2026-09-22',error:null}),from:(table:string)=>{
 const data=table==='_fiscal_sales_debug_token'?{token:'synthetic'}:table==='fiscal_companies'?[{id:'test',uf:'AL'}]:table==='extractor_companies'?[{fiscal_company_id:'test'}]:table==='fiscal_sales_sync_state'?{status:'queued',paused}:table==='fiscal_certificates'?(certificate?{id:'cert'}:null):table==='fiscal_state_credentials'?null:null;
 const q:any={then:(r:any)=>r({data,error:null})};
 for(const k of ['select','eq','gte','limit','maybeSingle'])q[k]=()=>q;
 q.upsert=(value:any)=>{writes(value);return q};return q;
 }};
 runInNewContext(code,{Deno:{env:{get:()=> 'synthetic'},serve:(fn:any)=>{handler=fn}},createClient:()=>client,Response,Date,fetch,AbortSignal});
 return{writes,fetch,run:(token='synthetic')=>handler(new Request('https://example.test',{method:'POST',headers:{'x-debug-token':token}}))};
}
describe('sales cron prerequisites',()=>{
 it('starts the sales search without requiring state credentials',async()=>{const b=setup();expect((await b.run()).status).toBe(200);expect(b.writes).toHaveBeenCalledWith(expect.objectContaining({status:'running'}));expect(b.writes).not.toHaveBeenCalledWith(expect.objectContaining({status:'waiting_state_credentials'}))});
 it('records missing certificate without changing cursors',async()=>{const b=setup({certificate:false});await b.run();expect(b.writes).toHaveBeenCalledWith(expect.objectContaining({status:'waiting_certificate'}));expect(b.writes.mock.calls[0][0]).not.toHaveProperty('cursor_number')});
 it('preserves paused companies',async()=>{const b=setup({paused:true});await b.run();expect(b.writes).not.toHaveBeenCalled();expect(b.fetch).not.toHaveBeenCalled()});
 it('refuses unauthenticated calls',async()=>{const b=setup();expect((await b.run('')).status).toBe(403);expect(b.writes).not.toHaveBeenCalled()});
});
