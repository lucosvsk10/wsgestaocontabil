import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.0";
import pdfMakeImport from "npm:pdfmake@0.2.20/build/pdfmake.js";
import pdfFontsImport from "npm:pdfmake@0.2.20/build/vfs_fonts.js";
import { parseDanfse } from "./xml-parser.ts";
import { buildDanfseDefinition } from "./pdf-definition.ts";
const pdfMake:any=(pdfMakeImport as any).default??pdfMakeImport;
const pdfFonts:any=(pdfFontsImport as any).default??pdfFontsImport;
pdfMake.vfs=pdfFonts?.pdfMake?.vfs??pdfFonts;
pdfMake.fonts={Roboto:{normal:"Roboto-Regular.ttf",bold:"Roboto-Medium.ttf",italics:"Roboto-Italic.ttf",bolditalics:"Roboto-MediumItalic.ttf"}};
const J=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
const pdfBase64=async(def:any)=>await new Promise<string>((resolve,reject)=>{try{pdfMake.createPdf(def).getBase64((value:string)=>resolve(value));}catch(e){reject(e);}});
Deno.serve(async(req)=>{
  try{
    if(req.method!=="POST") return J({error:"Method not allowed"},405);
    const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const debug=req.headers.get("x-debug-token")||"";
    const {data:tokenRow}=await admin.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle();
    if(!debug||!tokenRow?.token||debug!==String(tokenRow.token)) return J({error:"Não autorizado"},401);
    const body=await req.json();
    const doc=body?.document??{};
    const xml=String(doc?.xml??"");
    if(!xml) return J({error:"XML ausente"},400);
    const data=parseDanfse(xml,doc);
    const definition=buildDanfseDefinition(data);
    const base64=await pdfBase64(definition);
    return J({ok:true,engine:"pdfmake",filename:"danfse-pdfmake-"+(doc.accessKey||doc.number||"documento")+".pdf",pdf_base64:base64,bytes_estimate:Math.floor(base64.length*0.75),access_key:data.accessKey,number:data.number});
  }catch(e){
    return J({error:e instanceof Error?e.message:String(e),stack:e instanceof Error?e.stack:null},500);
  }
});