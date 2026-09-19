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

const J=(body:any,status=200)=>new Response(JSON.stringify(body),{
  status,
  headers:{"content-type":"application/json","cache-control":"no-store"}
});

const pdfBase64=async(def:any)=>await new Promise<string>((resolve,reject)=>{
  try{
    (pdfMake as any).createPdf(def).getBase64((value:string)=>resolve(value));
  }catch(e){ reject(e); }
});

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

    const filename="danfse-pdfmake-"+(doc.accessKey||doc.number||"documento")+".pdf";
    if(body?.debug_store===true){
      const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
      const path="debug-fiscal-pdfmake/"+Date.now()+"-"+filename;
      const {error:uploadError}=await admin.storage.from("saas-private").upload(path,bytes,{contentType:"application/pdf",upsert:true});
      if(uploadError) throw uploadError;
      const {data:signed,error:signedError}=await admin.storage.from("saas-private").createSignedUrl(path,1800);
      if(signedError) throw signedError;
      return J({ok:true,engine:"pdfmake-esm-deno",filename,bytes_estimate:bytes.length,access_key:data.accessKey,number:data.number,debug_path:path,signed_url:signed.signedUrl});
    }
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
      name:e instanceof Error?e.name:null,
      stack:e instanceof Error?e.stack:null
    },500);
  }
});