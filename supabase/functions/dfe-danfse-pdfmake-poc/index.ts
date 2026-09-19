import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.0";
import pdfMake from "https://esm.sh/pdfmake@0.2.20/build/pdfmake.js?target=deno";
import pdfFonts from "https://esm.sh/pdfmake@0.2.20/build/vfs_fonts.js?target=deno";
import { parseDanfse } from "./xml-parser.ts";
import { buildDanfseDefinition } from "./pdf-definition.ts";

(pdfMake as any).addVirtualFileSystem(pdfFonts as any);
(pdfMake as any).fonts={
  Roboto:{
    normal:"Roboto-Regular.ttf",
    bold:"Roboto-Medium.ttf",
    italics:"Roboto-Italic.ttf",
    bolditalics:"Roboto-MediumItalic.ttf"
  }
};

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-debug-token",
};
const J=(body:any,status=200)=>new Response(JSON.stringify(body),{
  status,
  headers:{...cors,"content-type":"application/json","cache-control":"no-store"}
});

async function canAccessCompany(admin:any,userId:string,companyId:string){
  const {data:roles}=await admin.from("user_roles").select("role").eq("user_id",userId);
  if(roles?.some((r:any)=>r.role==="admin")) return true;

  const {data:links}=await admin
    .from("extractor_companies")
    .select("account_id")
    .eq("fiscal_company_id",companyId)
    .eq("status","active");
  const ids=[...new Set((links||[]).map((x:any)=>String(x.account_id)).filter(Boolean))];
  if(!ids.length) return false;

  const {data:accounts}=await admin
    .from("extractor_accounts")
    .select("id,organization_id,status,lifetime_access,access_expires_at")
    .in("id",ids)
    .eq("status","active");
  const now=Date.now();
  const entitled=(accounts||[]).filter((a:any)=>
    a.lifetime_access===true ||
    (a.access_expires_at && new Date(a.access_expires_at).getTime()>now)
  );
  if(!entitled.length) return false;

  const orgs=entitled.map((a:any)=>a.organization_id);
  const {data:members}=await admin
    .from("organization_members")
    .select("id")
    .eq("user_id",userId)
    .eq("status","active")
    .in("organization_id",orgs)
    .limit(1);
  return Boolean(members?.length);
}

const pdfBase64=async(def:any)=>await new Promise<string>((resolve,reject)=>{
  try{
    (pdfMake as any).createPdf(def).getBase64((value:string)=>resolve(value));
  }catch(e){reject(e);}
});

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  try{
    if(req.method!=="POST") return J({error:"Method not allowed"},405);

    const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const debug=req.headers.get("x-debug-token")||"";
    const auth=req.headers.get("authorization")||"";
    const {data:tokenRow}=debug
      ? await admin.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle()
      : {data:null as any};
    const debugAuthorized=Boolean(debug && tokenRow?.token && debug===String(tokenRow.token));

    let user:any=null;
    if(!debugAuthorized){
      if(!auth) return J({error:"Não autenticado"},401);
      const authResult=await admin.auth.getUser(auth.replace(/^Bearer\s+/i,""));
      user=authResult.data.user;
      if(!user) return J({error:"Não autenticado"},401);
    }

    const body=await req.json();
    const doc=body?.document??{};
    const xml=String(doc?.xml??"");
    const companyId=String(body?.company_id||doc?.companyId||"");

    if(!xml) return J({error:"XML ausente"},400);
    if(!debugAuthorized){
      if(!companyId) return J({error:"Empresa não informada"},400);
      if(!(await canAccessCompany(admin,user.id,companyId))) return J({error:"Empresa não autorizada para esta conta"},403);
    }

    const data=await parseDanfse(xml,doc);
    const definition=buildDanfseDefinition(data);
    const base64=await pdfBase64(definition);
    const filename="danfse-pdfmake-teste-"+(doc.accessKey||doc.number||"documento")+".pdf";

    return J({
      ok:true,
      engine:"pdfmake-esm-deno",
      filename,
      pdf_base64:base64,
      bytes_estimate:Math.floor(base64.length*0.75),
      access_key:data.accessKey,
      number:data.number
    });
  }catch(e){
    return J({
      error:e instanceof Error?e.message:String(e),
      name:e instanceof Error?e.name:null
    },500);
  }
});