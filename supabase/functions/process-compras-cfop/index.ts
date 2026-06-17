import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM_PROMPT = `Você é um assistente especializado em contabilidade fiscal brasileira. Sua tarefa é processar o texto extraído de um relatório "Registro de Entradas por CFOP" em PDF e identificar cada bloco de operação.

### REGRAS DE LEITURA
1. Identifique cada bloco de operação pelo número do CFOP (ex: 1101, 1252, 1407, 1556, 1653, 2101, 2407, 2556, etc.).
2. Para cada CFOP, capture:
   - "cfop": o código (string, 4 dígitos).
   - "descricao": a descrição da operação exatamente como aparece no PDF (texto completo, mantenha a redação original).
   - "vr_contabil": o valor numérico da coluna "Vr. Contábil" (NÃO use "Vr. Total"). Number, float, em reais.
3. Aplique um status de pré-seleção:
   - "selecionado": true para compras e materiais (1101, 2101, 1102, 2102, 1407, 1556, 2407, 2556 e variações de comercialização/industrialização).
   - "selecionado": false para despesas de consumo direto (1252 Energia Elétrica, 1653 Combustíveis e Lubrificantes) e outros CFOPs de serviços/despesas que não são compras de mercadoria.
4. Os CFOPs que DEVEM vir selecionados (compras lançáveis) são exclusivamente: 1101, 2101, 1102, 2102, 1407, 1556, 2407, 2556. Qualquer outro CFOP deve vir com "selecionado": false.
5. Se um CFOP aparecer mais de uma vez no relatório, some os "Vr. Contábil" em uma única linha por CFOP.

### FORMATO DO RETORNO (JSON STRICT)
Retorne ESTRITAMENTE um objeto JSON com a chave "linhas":
{
  "linhas": [
    { "cfop": "1101", "descricao": "COMPRA PARA INDUSTRIALIZAÇÃO OU PRODUÇÃO RURAL", "vr_contabil": 12345.67, "selecionado": true }
  ]
}
Se não houver dados extraíveis, retorne { "linhas": [] }. Não inclua texto fora do JSON.`;

const extractLinhas = (text: string): any[] => {
  const cleaned = String(text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  const s = cleaned.indexOf("{");
  const e = cleaned.lastIndexOf("}");
  if (s === -1 || e === -1) throw new Error(`Resposta IA inválida: ${cleaned.slice(0, 200)}`);
  const parsed = JSON.parse(cleaned.slice(s, e + 1));
  const arr = Array.isArray(parsed?.linhas) ? parsed.linhas : (Array.isArray(parsed) ? parsed : []);
  return arr.map((l: any) => ({
    cfop: String(l?.cfop ?? "").trim(),
    descricao: String(l?.descricao ?? "").trim(),
    vr_contabil: Number(l?.vr_contabil) || 0,
    selecionado: l?.selecionado !== false,
  })).filter((l: any) => l.cfop && l.vr_contabil > 0);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");
    const { uploadId } = await req.json();
    if (!uploadId) {
      return new Response(JSON.stringify({ error: "uploadId obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: up, error: upErr } = await supa
      .from("compras_uploads").select("*").eq("id", uploadId).maybeSingle();
    if (upErr || !up) throw new Error("Upload não encontrado");

    await supa.from("compras_uploads").update({ status: "processando", ultimo_erro: null }).eq("id", up.id);

    // (Regra fixa de CFOPs no SYSTEM_PROMPT — sem mapeamento por cliente)

    const { data: file, error: dlErr } = await supa.storage.from("lancamentos").download(up.storage_path);
    if (dlErr) throw dlErr;
    const buf = new Uint8Array(await file.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const b64 = btoa(bin);

    const body = {
      model: "google/gemini-2.5-flash",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: `${mappingText}\n\nAnalise o PDF do "Registro de Entradas por CFOP" anexo e retorne ESTRITAMENTE o JSON com a chave "linhas" conforme especificado.` },
            { type: "file", file: { filename: up.nome_arquivo, file_data: `data:application/pdf;base64,${b64}` } },
          ],
        },
      ],
    };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
      body: JSON.stringify(body),
    });
    if (aiRes.status === 429) throw new Error("Limite de requisições atingido. Tente novamente em alguns instantes.");
    if (aiRes.status === 402) throw new Error("Créditos da IA esgotados. Adicione créditos no workspace.");
    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`IA Gateway erro ${aiRes.status}: ${t.slice(0, 200)}`);
    }
    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? "";
    const linhas = extractLinhas(content);

    await supa.from("compras_uploads").update({
      status: "processado",
      dados_extraidos: { linhas },
      ultimo_erro: null,
    }).eq("id", up.id);

    return new Response(JSON.stringify({ success: true, linhas }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("process-compras-cfop error", e);
    try {
      const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
      const { uploadId } = await req.clone().json().catch(() => ({ uploadId: null }));
      if (uploadId) {
        await supa.from("compras_uploads").update({
          status: "erro", ultimo_erro: String(e.message || e).slice(0, 500),
        }).eq("id", uploadId);
      }
    } catch { /* ignore */ }
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
