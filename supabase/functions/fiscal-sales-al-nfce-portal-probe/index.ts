import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const J=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
const E=new TextEncoder(),D=new TextDecoder(),B=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
async function K(){const s=Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!s)throw Error("vault_secret_missing");const h=await crypto.subtle.digest("SHA-256",E.encode(`ws-fiscal-vault:${s}`));return crypto.subtle.importKey("raw",h,{name:"AES-GCM"},false,["decrypt"])}
async function dec(c:string,i:string){return D.decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:B(i)},await K(),B(c)))}
function mergeCookie(current:string,headers:Headers){const jar=new Map<string,string>();for(const p of current.split(/;\s*/)){const i=p.indexOf("=");if(i>0)jar.set(p.slice(0,i),p.slice(i+1))}const list=(headers as any).getSetCookie?.()||[];for(const raw of list){const pair=String(raw).split(";",1)[0],i=pair.indexOf("=");if(i>0)jar.set(pair.slice(0,i),pair.slice(i+1))}const single=headers.get("set-cookie");if(single&&!list.length){const pair=single.split(";",1)[0],i=pair.indexOf("=");if(i>0)jar.set(pair.slice(0,i),pair.slice(i+1))}return[...jar].map(([k,v])=>`${k}=${v}`).join("; ")}
async function request(url:string,init:RequestInit={},cookie=""){const headers=new Headers(init.headers||{});headers.set("user-agent","Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/153 Safari/537.36");if(cookie)headers.set("cookie",cookie);const r=await fetch(url,{...init,headers,redirect:"manual",signal:AbortSignal.timeout(45000)});const text=await r.text();return{status:r.status,headers:r.headers,text}}
Deno.serve(async req=>{try{
 const a=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
 const supplied=req.headers.get("x-debug-token")||"";const{data:t}=await a.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle();if(supplied!==String(t?.token||""))return J({error:"unauthorized"},403);
 const b=await req.json().catch(()=>({})) as any,cid=String(b.company_id||"");if(!cid)return J({error:"company_id_required"},400);
 const{data:c}=await a.from("fiscal_companies").select("id,cnpj,inscricao_estadual,uf,status").eq("id",cid).maybeSingle();if(!c||c.status!=="ativa"||String(c.uf||"").toUpperCase()!=="AL")return J({error:"company_not_active_al"},422);
 const{data:cred}=await a.from("fiscal_state_credentials").select("username_ciphertext,username_iv,password_ciphertext,password_iv,last_verification_status,is_active").eq("company_id",cid).eq("uf","AL").eq("is_active",true).maybeSingle();if(!cred||!["valid","valid_without_report_permission"].includes(String(cred.last_verification_status||"")))return J({error:"credential_not_usable"},409);
 const username=await dec(cred.username_ciphertext,cred.username_iv),password=await dec(cred.password_ciphertext,cred.password_iv);
 const base="https://nfce.sefaz.al.gov.br";let cookie="";
 let r=await request(base+"/sca_default_login_page",{},cookie);cookie=mergeCookie(cookie,r.headers);
 const form=new URLSearchParams({sca_login:username,sca_senha:password,btn_entrar:"Entrar"}).toString();
 r=await request(base+"/sca_security_check",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded","origin":base,"referer":base+"/sca_default_login_page"},body:form},cookie);cookie=mergeCookie(cookie,r.headers);
 let location=r.headers.get("location"),last=base+"/sca_security_check";
 for(let i=0;i<8&&location;i++){const next=new URL(location,base).toString();last=next;r=await request(next,{headers:{referer:base}},cookie);cookie=mergeCookie(cookie,r.headers);location=r.headers.get("location")}
 const text=r.text||"",loginPage=/sca_default_login_page|name=["']sca_login/i.test(text+" "+String(location||"")),invalid=/senha inv[aá]lida|usu[aá]rio inv[aá]lido/i.test(text);
 if(invalid||loginPage)return J({ok:false,login_valid:false,http:r.status,final_path:new URL(last).pathname},422);
 const links=[...text.matchAll(/(?:href|src|action)=["']([^"'#]+)["']/gi)].map(m=>String(m[1]||"")).filter(v=>/(relat|consulta|nfce|nota|xml|download|chave|emit|saida|entrada)/i.test(v)).map(v=>{try{return new URL(v,base).pathname+new URL(v,base).search}catch{return v.slice(0,240)}}).filter((v,i,a)=>a.indexOf(v)===i).slice(0,120);
 const forms=[...text.matchAll(/<form[^>]*action=["']([^"']+)["'][^>]*>/gi)].map(m=>m[1]).slice(0,40);
 const scripts=[...text.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>m[1]).slice(0,60);
 const title=(text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"").replace(/\s+/g," ").trim();
 const visible=text.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,2500);
 return J({ok:true,login_valid:true,http:r.status,final_path:new URL(last).pathname,title,links,forms,scripts,visible_excerpt:visible});
}catch(e){return J({error:e instanceof Error?e.message:String(e)},500)}});