const https=require('node:https');
function J(res,s,b){res.statusCode=s;res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('cache-control','no-store');res.end(JSON.stringify(b))}
function get(url){return new Promise((ok,no)=>{const u=new URL(url);const r=https.get({hostname:u.hostname,path:u.pathname+u.search,headers:{'user-agent':'Mozilla/5.0'},timeout:30000},x=>{const b=[];x.on('data',c=>b.push(Buffer.from(c)));x.on('end',()=>ok({status:x.statusCode||0,text:Buffer.concat(b).toString('utf8')}))});r.on('error',no);r.on('timeout',()=>r.destroy(new Error('timeout')));})}
module.exports=async(req,res)=>{try{
 const base='https://contribuinte.sefaz.al.gov.br/malhafiscal/';
 const h=await get(base);
 const scripts=[...h.text.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>new URL(m[1],base).toString());
 const out=[];
 const terms=['resourceEscrituracaoNaoExtemporaneo','emitirRelatorioEscrituracaoNaoExtemporaneo','obterAnosComInconsistencias','escrituracao-nao-extemporaneo','escrituracaoNaoExtemporaneo','getNotasOmissas','descricaoTipoOperacao','codigoModeloNotaFiscal','saidaNFe','saidaNFCe','entradaNFe'];
 for(const url of scripts.slice(-12)){
   const r=await get(url);
   const hits=[];
   for(const term of terms){
     let from=0,count=0;
     while(count<6){
       const i=r.text.indexOf(term,from);
       if(i<0)break;
       hits.push({term,index:i,snippet:r.text.slice(Math.max(0,i-500),i+1200)});
       from=i+term.length;count++;
     }
   }
   const routeStrings=[...new Set([...r.text.matchAll(/["'`]([^"'\`]{1,260})["'`]/g)].map(m=>m[1]).filter(v=>/(api\/|nfe|nfce|nota|chave|saida|omiss|detalh|escritur|pendencia|relatorio)/i.test(v)))].slice(0,500);
   if(hits.length||routeStrings.length)out.push({url,status:r.status,bytes:Buffer.byteLength(r.text),hits,route_strings:routeStrings});
 }
 return J(res,200,{ok:true,page_http:h.status,scripts,out});
}catch(e){return J(res,500,{error:e instanceof Error?e.message:String(e)})}}