const https=require('node:https');
function J(res,s,b){res.statusCode=s;res.setHeader('content-type','application/json');res.setHeader('cache-control','no-store');res.end(JSON.stringify(b))}
function get(url){return new Promise((ok,no)=>{const u=new URL(url);const r=https.get({hostname:u.hostname,path:u.pathname+u.search,headers:{'user-agent':'Mozilla/5.0'},timeout:30000},x=>{const b=[];x.on('data',c=>b.push(c));x.on('end',()=>ok(Buffer.concat(b).toString('utf8')))});r.on('error',no);r.on('timeout',()=>r.destroy(new Error('timeout')));})}
module.exports=async(req,res)=>{try{
 const url='https://nfeas.sefaz.al.gov.br/gwtapp/17B9688C7FCB092178ADBD10B81EA1F8.cache.js';
 const t=await get(url);
 const names=['IG','JG','KG','HG'];
 const out={};
 for(const n of names){const i=t.indexOf('function '+n+'(');out[n]=i<0?null:t.slice(i,i+700)}
 return J(res,200,{ok:true,...out});
}catch(e){return J(res,500,{error:e.message})}}