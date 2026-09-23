const https=require('node:https');
function J(res,s,b){res.statusCode=s;res.setHeader('content-type','application/json');res.setHeader('cache-control','no-store');res.end(JSON.stringify(b))}
function get(url){return new Promise((ok,no)=>{const u=new URL(url);const r=https.get({hostname:u.hostname,path:u.pathname+u.search,headers:{'user-agent':'Mozilla/5.0'},timeout:30000},x=>{const b=[];x.on('data',c=>b.push(c));x.on('end',()=>ok(Buffer.concat(b).toString('utf8')))});r.on('error',no);r.on('timeout',()=>r.destroy(new Error('timeout')));})}
module.exports=async(req,res)=>{try{
 const t=await get('https://nfeas.sefaz.al.gov.br/gwtapp/17B9688C7FCB092178ADBD10B81EA1F8.cache.js');
 const terms=String(req.query?.term||'consultarNotasFiscaisDeEntradaIhSaidaPaginada').split(',').map(x=>x.trim()).filter(Boolean).slice(0,8);
 const hits=[];
 for(const term of terms){let from=0,count=0;while(count<12){const i=t.indexOf(term,from);if(i<0)break;hits.push({term,index:i,snippet:t.slice(Math.max(0,i-2500),i+6500)});from=i+term.length;count++}}
 return J(res,200,{ok:true,bytes:Buffer.byteLength(t),hits});
}catch(e){return J(res,500,{error:e.message})}}