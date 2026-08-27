import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const money = (v: unknown) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtCnpj = (v: unknown) => { const d = digits(v); return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : String(v || "-"); };
const fmtDate = (v: unknown) => { const d = new Date(String(v || "")); return Number.isNaN(d.getTime()) ? String(v || "-") : d.toLocaleString("pt-BR"); };
const clean = (v: unknown) => String(v ?? "").replace(/[\r\n\t]+/g, " ").trim();

function wrap(text: string, max: number) {
  const words = text.split(/\s+/).filter(Boolean); const lines: string[] = []; let line = "";
  for (const word of words) { const next = line ? `${line} ${word}` : word; if (next.length > max && line) { lines.push(line); line = word; } else line = next; }
  if (line) lines.push(line); return lines.length ? lines : ["-"];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization"); if (!auth) return json({ error: "Não autenticado" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await admin.auth.getUser(auth.replace("Bearer ", "")); if (!user) return json({ error: "Não autenticado" }, 401);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((r: any) => r.role === "admin")) return json({ error: "Acesso exclusivo para administradores" }, 403);

    const body = await req.json() as Record<string, any>; const doc = body.document || {};
    if (doc.documentKind === "evento" || doc.direction === "relacionada") return json({ error: "PDF DANFE disponível apenas para NF-e/NFC-e." }, 422);

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const black = rgb(0, 0, 0);
    const margin = 28; const width = 595.28 - margin * 2;
    const drawText = (text: string, x: number, y: number, size = 9, isBold = false) => page.drawText(clean(text) || "-", { x, y, size, font: isBold ? bold : font, color: black });
    const box = (x: number, y: number, w: number, h: number) => page.drawRectangle({ x, y, width: w, height: h, borderColor: black, borderWidth: 1 });

    drawText("DANFE", margin + width - 125, 793, 22, true);
    drawText("Documento Auxiliar da Nota Fiscal Eletrônica", margin + width - 205, 777, 7, true);
    drawText(doc.issuerName || "Emitente não informado", margin + 8, 799, 13, true);
    drawText(`CNPJ: ${fmtCnpj(doc.issuerCnpj)}`, margin + 8, 782, 8);
    box(margin, 762, width, 58);
    page.drawLine({ start: { x: margin + 330, y: 762 }, end: { x: margin + 330, y: 820 }, thickness: 1, color: black });
    drawText(`NF-e nº ${doc.number || "-"}`, margin + 344, 750 + 42, 10, true);
    drawText(`Série ${doc.series || "-"}`, margin + 344, 750 + 27, 9);

    box(margin, 712, width, 42);
    drawText("CHAVE DE ACESSO", margin + 8, 740, 7, true);
    const keyLines = wrap(clean(doc.accessKey || "-"), 55);
    drawText(keyLines[0], margin + 8, 723, 10, true);

    const rowY = 646; box(margin, rowY, width, 58);
    page.drawLine({ start: { x: margin + width / 3, y: rowY }, end: { x: margin + width / 3, y: rowY + 58 }, thickness: 1, color: black });
    page.drawLine({ start: { x: margin + 2 * width / 3, y: rowY }, end: { x: margin + 2 * width / 3, y: rowY + 58 }, thickness: 1, color: black });
    drawText("DATA DE EMISSÃO", margin + 8, rowY + 43, 7, true); drawText(fmtDate(doc.issueDate), margin + 8, rowY + 25, 8);
    drawText("TIPO", margin + width / 3 + 8, rowY + 43, 7, true); drawText(doc.direction === "saida" ? "SAÍDA" : "ENTRADA", margin + width / 3 + 8, rowY + 25, 10, true);
    drawText("VALOR TOTAL", margin + 2 * width / 3 + 8, rowY + 43, 7, true); drawText(money(doc.value), margin + 2 * width / 3 + 8, rowY + 25, 11, true);

    box(margin, 578, width, 58);
    page.drawLine({ start: { x: margin + width / 2, y: 578 }, end: { x: margin + width / 2, y: 636 }, thickness: 1, color: black });
    drawText("CNPJ EMITENTE", margin + 8, 621, 7, true); drawText(fmtCnpj(doc.issuerCnpj), margin + 8, 602, 9);
    drawText("CNPJ DESTINATÁRIO", margin + width / 2 + 8, 621, 7, true); drawText(fmtCnpj(doc.recipientCnpj), margin + width / 2 + 8, 602, 9);

    box(margin, 500, width, 66);
    drawText("DADOS DO DOCUMENTO", margin + 8, 551, 7, true);
    drawText(`Status: ${doc.statusCode || "-"}`, margin + 8, 532, 8);
    drawText(`NSU: ${doc.nsu || "-"}`, margin + 8, 516, 8);
    drawText(`Schema: ${doc.schema || "-"}`, margin + 250, 532, 8);

    drawText("Visualização gerada pelo WS Gestão a partir do XML/DF-e armazenado.", margin, 462, 7);
    drawText("Para validade fiscal, prevalecem o XML autorizado e o protocolo da SEFAZ.", margin, 450, 7, true);

    const bytes = await pdf.save();
    let binary = ""; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return json({ ok: true, pdf_base64: btoa(binary), filename: `${doc.accessKey || doc.nsu || "danfe"}.pdf` });
  } catch (reason) {
    console.error("dfe-danfe-pdf", reason);
    return json({ error: reason instanceof Error ? reason.message : String(reason) }, 500);
  }
});
