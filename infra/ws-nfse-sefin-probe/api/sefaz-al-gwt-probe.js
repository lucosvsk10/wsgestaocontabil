const https=require('node:https');

function json(res,status,body){res.statusCode=status;res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('cache-control','no-store');res.end(JSON.stringify(body));}
function get(url){return new Promise((resolve,reject)=>{const u=new URL(url);const r=https.request({hostname:u.hostname,port:443,path:u.pathname+u.search,method:'GET',headers:{'User-Agent':'Mozilla/5.0','Accept':'*/*'},timeout:30000},x=>{const b=[];x.on('data',c=>b.push(Buffer.from(c)));x.on('end',()=>resolve({status:x.statusCode||0,text:Buffer.concat(b).toString('utf8'),headers:x.headers}));});r.on('timeout',()=>r.destroy(new Error('timeout')));r.on('error',reject);r.end();});}
function uniq(a){return [...new Set(a.filter(Boolean))];}
module.exports=async function(req,res){
  if(req.method!=='GET')return json(res,405,{error:'method_not_allowed'});
  try{
    const base='https://nfeas.sefaz.al.gov.br/gwtapp/';
    const boot=await get(base+'gwtapp.nocache.js');
    if(boot.status<200||boot.status>=400)return json(res,502,{error:'bootstrap_http_'+boot.status});
    const scripts=uniq([
      ...[...boot.text.matchAll(/['"]([A-Za-z0-9_-]+\.cache\.js)['"]/g)].map(m=>m[1]),
      ...[...boot.text.matchAll(/([A-F0-9]{20,}\.cache\.js)/g)].map(m=>m[1]),
    ]);
    const strong=uniq([
      ...[...boot.text.matchAll(/['"]([A-F0-9]{20,})['"]/g)].map(m=>m[1]),
    ]);
    const candidates=scripts.slice(0,12);
    const inspected=[];
    for(const file of candidates){
      const r=await get(base+file);
      const txt=r.text||'';
      const hits=['consultarNotasFiscaisDeEntradaIhSaidaPaginada','consultarQuantidadeNotasFiscaisDeEntradaIhSaida','consultarRelatoriosEntradaIhSaida','NotaFiscalConsultaDTO','NFeRelatoriosRemoteService']
        .map(term=>{const i=txt.indexOf(term);return i>=0?{term,index:i,snippet:txt.slice(Math.max(0,i-1400),i+3500)}:null}).filter(Boolean);
      inspected.push({file,http:r.status,bytes:Buffer.byteLength(txt),hits});
    }
    return json(res,200,{ok:true,bootstrap_http:boot.status,bootstrap_bytes:Buffer.byteLength(boot.text),scripts:candidates,strong_names:strong.slice(0,30),inspected});
  }catch(e){return json(res,500,{error:e instanceof Error?e.message:String(e)});}
};