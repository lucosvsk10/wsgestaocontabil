const https=require('node:https');
function J(res,s,b){res.statusCode=s;res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('cache-control','no-store');res.end(JSON.stringify(b))}
function get(url){return new Promise((ok,no)=>{const u=new URL(url);const r=https.get({hostname:u.hostname,path:u.pathname+u.search,headers:{'user-agent':'Mozilla/5.0'},timeout:30000},x=>{const b=[];x.on('data',c=>b.push(Buffer.from(c)));x.on('end',()=>ok({status:x.statusCode||0,text:Buffer.concat(b).toString('utf8')}))});r.on('error',no);r.on('timeout',()=>r.destroy(new Error('timeout')));})}
module.exports=async(req,res)=>{try{
 const url='https://contribuinte.sefaz.al.gov.br/malhafiscal/app/main.47261d66a4b38028087f.bundle.js';
 const r=await get(url);
 const focus=String(req.query?.term||'').trim().slice(0,160);
 const terms=[...(focus?[focus]:[]),'obterNotasDaMalha','this.caceal=','tipoOperacao','tamanhoPagina','chaveAcesso','notafiscais-omissas-malha','resourceEscrituracaoNaoExtemporaneo','emitirRelatorioEscrituracaoNaoExtemporaneo','getNotasOmissas','notaFiscal'];
 const hits=[];
 for(const term of terms){let from=0,count=0;while(count<12){const i=r.text.indexOf(term,from);if(i<0)break;hits.push({term,index:i,snippet:r.text.slice(Math.max(0,i-3200),i+9000)});from=i+term.length;count++}}
 return J(res,200,{ok:true,http:r.status,bytes:Buffer.byteLength(r.text),hits});
}catch(e){return J(res,500,{error:e instanceof Error?e.message:String(e)})}}