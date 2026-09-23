const https=require('node:https');
const crypto=require('node:crypto');

const GATEWAY_TOKEN_SHA256='7725295432774011f678a73ced1ae9761a168ba47df4f008f971f90ac0bd2352';
function json(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body));}
function sha256(v){return crypto.createHash('sha256').update(String(v||'')).digest('hex')}
function safeEqual(a,b){const aa=Buffer.from(String(a||'')),bb=Buffer.from(String(b||''));return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb)}
function authorized(req){const supplied=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');return supplied&&safeEqual(sha256(supplied),GATEWAY_TOKEN_SHA256)}
function digits(v){return String(v||'').replace(/\D/g,'')}
function readBody(req){return new Promise((resolve,reject)=>{let raw='';req.setEncoding('utf8');req.on('data',c=>{raw+=c;if(raw.length>256*1024)reject(new Error('payload_too_large'))});req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{})}catch{reject(new Error('invalid_json'))}});req.on('error',reject)})}
function mergeCookies(current,setCookie){const jar=new Map();for(const p of String(current||'').split(/;\s*/)){const i=p.indexOf('=');if(i>0)jar.set(p.slice(0,i),p.slice(i+1))}const arr=Array.isArray(setCookie)?setCookie:setCookie?[setCookie]:[];for(const raw of arr){const pair=String(raw||'').split(';',1)[0];const i=pair.indexOf('=');if(i>0)jar.set(pair.slice(0,i),pair.slice(i+1))}return [...jar].map(([k,v])=>`${k}=${v}`).join('; ')}
function requestUrl(url,{method='GET',headers={},body=''}={}){const target=new URL(url);return new Promise((resolve,reject)=>{const r=https.request({hostname:target.hostname,port:443,path:target.pathname+target.search,method,minVersion:'TLSv1.2',rejectUnauthorized:true,servername:target.hostname,timeout:60000,headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/153 Safari/537.36','Connection':'close',...headers,...(body?{'Content-Length':Buffer.byteLength(body)}:{})}},x=>{const chunks=[];x.on('data',c=>chunks.push(Buffer.from(c)));x.on('end',()=>resolve({status:x.statusCode||0,headers:x.headers,body:Buffer.concat(chunks)}))});r.on('timeout',()=>r.destroy(new Error('sefaz_al_sales_timeout')));r.on('error',reject);if(body)r.write(body);r.end()})}
async function login(username,password){
  const base='https://nfeas.sefaz.al.gov.br';let cookie='',lastUrl=base+'/sca_default_login_page';
  let r=await requestUrl(lastUrl);cookie=mergeCookies(cookie,r.headers['set-cookie']);
  const form=new URLSearchParams({sca_login:username,sca_senha:password,btn_entrar:'Entrar'}).toString();
  lastUrl=base+'/sca_security_check';
  r=await requestUrl(lastUrl,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Cookie':cookie,'Origin':base,'Referer':base+'/sca_default_login_page'},body:form});
  cookie=mergeCookies(cookie,r.headers['set-cookie']);
  let location=r.headers.location;
  for(let i=0;i<8&&location;i++){const next=new URL(location,base).toString();lastUrl=next;r=await requestUrl(next,{headers:{'Cookie':cookie,'Referer':base}});cookie=mergeCookies(cookie,r.headers['set-cookie']);location=r.headers.location}
  const text=r.body.toString('utf8');
  const rejected=/senha inv[aá]lida|usu[aá]rio inv[aá]lido|sca_default_login_page/i.test(String(r.headers.location||'')+' '+text);
  if(rejected||!cookie)throw Object.assign(new Error('invalid_credentials'),{status:422});
  const cookieNames=String(cookie||'').split(/;\s*/).map(x=>x.split('=',1)[0]).filter(Boolean);
  const pageTitle=(text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'').replace(/\s+/g,' ').trim().slice(0,180);
  const safeLinks=[...text.matchAll(/href=["']([^"'#]+)["']/gi)]
    .map(m=>String(m[1]||''))
    .filter(h=>/(nfe|relat|consulta|gwt)/i.test(h))
    .map(h=>{try{return new URL(h,base).pathname}catch{return h.slice(0,180)}})
    .filter((v,i,a)=>v&&a.indexOf(v)===i)
    .slice(0,30);
  return {cookie,meta:{final_status:r.status,final_path:new URL(lastUrl).pathname,redirect:location||null,cookie_names:cookieNames,page_title:pageTitle,safe_links:safeLinks}};
}
function brDate(iso){const m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return'';return `${m[3]}/${m[2]}/${m[1]}`}
async function getSalesReport({username,password,cnpj,ie,start,end,format='csv'}){
  const session=await login(username,password);let cookie=session.cookie;
  const app='https://nfeas.sefaz.al.gov.br/gwtapp/';
  const landing=await requestUrl(app,{headers:{'Cookie':cookie,'Accept':'text/html,*/*'}});
  cookie=mergeCookies(cookie,landing.headers['set-cookie']);
  const q=new URLSearchParams({
    ufEntrada:'AL',
    numeroCnpjEntrada:cnpj,
    numeroCacealEntrada:ie,
    ufDestino:'',
    numeroCnpjDestino:'',
    numeroCacealDestino:'',
    dataEmissaoInicial:brDate(start)+' 00:00',
    dataEmissaoFinal:brDate(end)+' 23:59',
    dataAutorizacaoInicial:'',
    dataAutorizacaoFinal:'',
    codigoStatus:'A,C,D',
    placaVeiculo:'',
    tipoProcessoEmissao:'-1',
    tipoOperacao:'-1',
  });
  const candidates=[
    `https://nfeas.sefaz.al.gov.br/gwtapp/relatorio/relatorioEntradasIhSaidas.${format}?${q.toString()}`,
    `https://nfeas.sefaz.al.gov.br/relatorio/relatorioEntradasIhSaidas.${format}?${q.toString()}`,
  ];
  let report=null,usedUrl='';
  const attempts=[];
  for(const url of candidates){
    const current=await requestUrl(url,{headers:{'Cookie':cookie,'Referer':app,'Accept':format==='csv'?'text/csv,text/plain,*/*':'application/pdf,*/*'}});
    attempts.push({route:new URL(url).pathname,status:current.status,content_type:String(current.headers['content-type']||''),bytes:current.body.length});
    if(!report||current.status!==404){report=current;usedUrl=url}
    if(current.status!==404)break;
  }
  const safeExcerpt=(report?.body?.toString('utf8')||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,320);
  console.log('SEFAZ AL sales report routes',{login:session.meta,landing_http:landing.status,attempts,response_excerpt:safeExcerpt});
  const contentType=String(report?.headers?.['content-type']||'');
  const text=report?.body?.toString('utf8')||'';
  const loginPage=/sca_default_login_page|sca_security_check|name=["']sca_login/i.test(text);
  const ok=Boolean(report&&report.status>=200&&report.status<300&&!loginPage&&report.body.length>0);
  return {
    ok,
    error: ok ? null : (loginPage ? 'sales_report_auth_required' : ('sales_report_http_'+String(report?.status||0))),
    http:report?.status||0,content_type:contentType,bytes:report?.body?.length||0,
    landing_http:landing.status,
    route:usedUrl?new URL(usedUrl).pathname:null,
    ...(ok?{data_base64:report.body.toString('base64')}:{response_excerpt:text.replace(/\s+/g,' ').slice(0,700)}),
  };
}
module.exports=async function(req,res){
  if(req.method!=='POST')return json(res,405,{error:'method_not_allowed'});
  if(!authorized(req))return json(res,401,{error:'unauthorized'});
  try{
    const b=await readBody(req);
    const username=String(b.username||''),password=String(b.password||''),cnpj=digits(b.cnpj),ie=digits(b.ie),start=String(b.start||''),end=String(b.end||''),format=String(b.format||'csv').toLowerCase()==='pdf'?'pdf':'csv';
    if(!username||!password||!/^[0-9]{14}$/.test(cnpj)||!/^\d{8,9}$/.test(ie)||!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||start>end)return json(res,400,{error:'invalid_payload'});
    const result=await getSalesReport({username,password,cnpj,ie,start,end,format});
    return json(res,result.ok?200:502,result);
  }catch(e){
    const message=e instanceof Error?e.message:String(e);
    return json(res,message==='invalid_credentials'?422:500,{error:message,login_valid:message==='invalid_credentials'?false:null});
  }
};