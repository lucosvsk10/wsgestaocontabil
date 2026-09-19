import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.0";
import PdfPrinterImport from "npm:pdfmake@0.2.20/src/printer.js";
import { Buffer } from "node:buffer";
import { parseDanfse } from "./xml-parser.ts";
import { buildDanfseDefinition } from "./pdf-definition.ts";

const PdfPrinter:any=(PdfPrinterImport as any).default??PdfPrinterImport;
const fonts={
  Helvetica:{
    normal:"Helvetica",
    bold:"Helvetica-Bold",
    italics:"Helvetica-Oblique",
    bolditalics:"Helvetica-BoldOblique"
  }
};
const J=(body:any,status=200)=>new Response(JSON.stringify(body),{
  status,
  headers:{"content-type":"application/json","cache-control":"no-store"}
});

async function makePdfBase64(definition:any){
  const printer=new PdfPrinter(fonts);
  const doc=printer.createPdfKitDocument(definition);
  const chunks:any[]=[];
  return await new Promise<string>((resolve,reject)=>{
    doc.on("data",(chunk:any)=>chunks.push(chunk));
    doc.on("end",()=>resolve(Buffer.concat(chunks).toString("base64")));
    doc.on("error",(error:any)=>reject(error));
    doc.end();
  });
}

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
    const base64=await makePdfBase64(definition);
    return J({
      ok:true,
      engine:"pdfmake-server",
      filename:"danfse-pdfmake-"+(doc.accessKey||doc.number||"documento")+".pdf",
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