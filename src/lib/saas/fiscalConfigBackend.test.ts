// Backend contract tests: certificate parsing and Supabase are mocked; no A1 or network is used.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { Buffer } from 'node:buffer';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync('supabase/functions/saas-fiscal-config/index.ts','utf8').replace(/^import .*;\r?$/gm,'');
const compiled = ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
function backend(options:{certError?:boolean;otherCnpj?:boolean;rateLimited?:boolean}={}) {
  let handler!: (request:Request)=>Promise<Response>;
  const profile={id:'profile',tax_id:'99999999000191',fiscal_environment:'production'};
  const writes=vi.fn();
  const rpc=vi.fn().mockResolvedValue({error:null});
  const consume=vi.fn().mockResolvedValue({allowed:!options.rateLimited});
  const admin={auth:{getUser:async()=>({data:{user:{id:'user'}}})},rpc,from:(table:string)=>{
    const data=table==='organization_members'?{role:'owner',status:'active'}:table==='user_roles'?[]:profile;
    const query:any={then:(resolve:any)=>resolve({data,error:null})};
    for(const method of ['select','eq','order','limit','maybeSingle','single'])query[method]=()=>query;
    query.update=(payload:unknown)=>{writes(payload);return query};
    return query;
  }};
  runInNewContext(compiled,{Deno:{serve:(fn:typeof handler)=>{handler=fn},env:{get:()=>''}},createClient:()=>admin,Buffer,Response,Date,Error,console:{warn:vi.fn(),error:vi.fn()},consume,requestKey:()=>'',limited:(r:any)=>r.allowed?null:new Response(JSON.stringify({error:'Muitas tentativas'}),{status:429}),lerCertificado:()=>{if(options.certError)throw new Error('PKCS12 MAC verify failure');return {validadeFim:new Date('2030-01-01'),titular:{cnpj:options.otherCnpj?'11111111000191':profile.tax_id,nome:'TESTE'}}}});
  return {run:(body:unknown)=>handler(new Request('https://example.test',{method:'POST',headers:{Authorization:'Bearer synthetic'},body:JSON.stringify({organization_id:'org',...body as object})})),writes,rpc,consume};
}
describe('contrato do servidor de configuração fiscal',()=>{
  const upload={action:'save_certificate',certificate_base64:'AQID',certificate_password:'synthetic'};
  it('senha inválida retorna 422 com CORS e sem gravar',async()=>{
    const b=backend({certError:true});const r=await b.run(upload);
    expect(r.status).toBe(422);expect(r.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect((await r.json()).error).toContain('senha');expect(b.rpc).not.toHaveBeenCalled();
  });
  it('outro CNPJ mantém o certificado anterior',async()=>{
    const b=backend({otherCnpj:true});const r=await b.run(upload);
    expect(r.status).toBe(422);expect((await r.json()).error).toContain('outro CNPJ');expect(b.writes).not.toHaveBeenCalled();expect(b.rpc).not.toHaveBeenCalled();
  });
  it('renovação válida salva metadados sem mudar ambiente',async()=>{
    const b=backend();const r=await b.run(upload);expect(r.status).toBe(200);
    expect((await r.json()).certificate.cnpj).toBe('99999999000191');
    expect(b.rpc).toHaveBeenCalledTimes(1);expect(b.writes.mock.calls[0][0]).not.toHaveProperty('fiscal_environment');
    expect(b.consume.mock.calls[0][1]).toBe('saas_fiscal_certificate_upload');
  });
  it('limite de tentativas permanece legível no navegador',async()=>{
    const r=await backend({rateLimited:true}).run(upload);expect(r.status).toBe(429);expect(r.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
  it('numeração vazia é recusada antes da gravação',async()=>{
    const b=backend();const r=await b.run({action:'save_profile',profile:{next_number_nfe:''}});
    expect(r.status).toBe(422);expect(b.writes).not.toHaveBeenCalled();
  });
  it('ISS opcional vazio é normalizado como null',async()=>{
    const b=backend();const r=await b.run({action:'save_profile',profile:{default_iss_rate:''}});
    expect(r.status).toBe(200);expect(b.writes.mock.calls[0][0].default_iss_rate).toBeNull();
  });
});
