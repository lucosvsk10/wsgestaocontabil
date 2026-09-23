const https=require('node:https');
function J(res,s,b){res.statusCode=s;res.setHeader('content-type','application/json');res.setHeader('cache-control','no-store');res.end(JSON.stringify(b))}
function get(url){return new Promise((ok,no)=>{const u=new URL(url);const r=https.get({hostname:u.hostname,path:u.pathname+u.search,headers:{'user-agent':'Mozilla/5.0'},timeout:30000},x=>{const b=[];x.on('data',c=>b.push(c));x.on('end',()=>ok(Buffer.concat(b).toString('utf8')))});r.on('error',no);r.on('timeout',()=>r.destroy(new Error('timeout')));})}
module.exports=async(req,res)=>{try{
 const url='https://nfeas.sefaz.al.gov.br/gwtapp/17B9688C7FCB092178ADBD10B81EA1F8.cache.js';
 const t=await get(url);
 const names=['IG','JG','KG','HG'];
 const out={};
 for(const n of names){const i=t.indexOf('function '+n+'(');out[n]=i<0?null:t.slice(i,i+700)}
 const html=[...new Set([...t.matchAll(/['"]([^'"]+\.(?:html?|jsp)(?:\?[^'"]*)?)['"]/gi)].map(m=>m[1]))].filter(x=>x.length<180).slice(0,120);
 const paths=[...new Set([...t.matchAll(/['"]([^'"]*(?:relatorio|gwtapp|nfe)[^'"]*)['"]/gi)].map(m=>m[1]))].filter(x=>x.length>0&&x.length<180).slice(0,160);
 const candidates=[
   'https://nfeas.sefaz.al.gov.br/gwtapp/relatorio/relatorioEntradasIhSaidas.csv',
   'https://nfeas.sefaz.al.gov.br/gwtapp/nfe/relatorio/relatorioEntradasIhSaidas.csv',
   'https://nfeas.sefaz.al.gov.br/relatorio/relatorioEntradasIhSaidas.csv',
   'https://nfeas.sefaz.al.gov.br/gwtapp/relatorios/relatorioEntradasIhSaidas.csv'
 ];
 const routeTests=[];
 for(const url of candidates){
   try{
     const u=new URL(url);
     const result=await new Promise((ok,no)=>{const q=https.get({hostname:u.hostname,path:u.pathname,headers:{'user-agent':'Mozilla/5.0'},timeout:15000},x=>{const b=[];x.on('data',v=>b.push(v));x.on('end',()=>ok({status:x.statusCode||0,location:x.headers.location||null,type:x.headers['content-type']||null,bytes:Buffer.concat(b).length}))});q.on('error',no);q.on('timeout',()=>q.destroy(new Error('timeout')))});
     routeTests.push({path:u.pathname,...result});
   }catch(e){routeTests.push({path:url,error:e.message})}
 }
 return J(res,200,{ok:true,...out,html,paths,routeTests});
}catch(e){return J(res,500,{error:e.message})}}