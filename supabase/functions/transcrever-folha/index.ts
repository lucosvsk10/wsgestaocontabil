import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM_PROMPT = `Você é um DIGITALIZADOR de folha de pagamento. Sua ÚNICA tarefa é COPIAR, linha por linha, a tabela impressa no PDF — exatamente como ela aparece.

REGRAS ABSOLUTAS (violação = falha):
- NUNCA some, arredonde, complete, infira, estime ou "corrija" nenhum valor.
- NUNCA invente linha que não esteja no PDF. NUNCA descarte linha que esteja no PDF.
- NUNCA mova valor entre colunas (Rendimento não vira Desconto e vice-versa).
- NUNCA una duas linhas em uma. Cada verba do PDF vira UMA linha da tabela transcrita.
- Copie cada número EXATAMENTE como impresso, centavo por centavo. Se o PDF diz "1.234,56", envie 1234.56.
- Se uma célula estiver vazia no PDF, envie null. Se estiver ilegível, envie null e cite em "observacoes_ia".

A coluna "Informativos" pode conter vários itens (Recol FGTS, Base INSS, Base IRRF etc). IGNORE tudo dessa coluna — exceto o **Recol FGTS**, que também costuma aparecer no bloco "Resultados" logo abaixo da tabela principal (rótulos aceitos: "Recol FGTS", "Recol. FGTS", "FGTS a recolher", "Recolhimento FGTS").

REGRA ESPECIAL PARA O RECOL FGTS:
- Adicione UMA linha extra na tabela transcrita representando o Recol FGTS, com:
  - "codigo": "RECOL_FGTS"
  - "descricao": "Recol. FGTS"
  - "referencia": null
  - "rendimento": null
  - "desconto": null
  - "recol_fgts": <valor exato impresso>
- Nas demais linhas (verbas da tabela principal), o campo "recol_fgts" deve ser SEMPRE null.
- Se o PDF não trouxer Recol FGTS, não crie essa linha e envie "total_recol_fgts_pdf": null.

TOTAIS OFICIAIS (rodapé da tabela):
- "total_rendimentos_pdf": soma impressa no rodapé da coluna Rendimentos.
- "total_descontos_pdf": soma impressa no rodapé da coluna Descontos.
- "total_recol_fgts_pdf": valor impresso do Recol FGTS no bloco "Resultados", se houver.
NÃO calcule esses totais — copie exatamente o que está impresso. Se não houver, envie null.

FORMATO DE RETORNO (JSON estrito, sem markdown):
{
  "linhas": [
    { "codigo": "STRING_OU_NULL", "descricao": "STRING", "referencia": "STRING_OU_NULL", "rendimento": NUMBER_OU_NULL, "desconto": NUMBER_OU_NULL, "recol_fgts": NUMBER_OU_NULL }
  ],
  "total_rendimentos_pdf": NUMBER_OU_NULL,
  "total_descontos_pdf": NUMBER_OU_NULL,
  "total_recol_fgts_pdf": NUMBER_OU_NULL,
  "observacoes_ia": "STRING"
}`;


const round2 = (n: number) => Math.round(n * 100) / 100;

const parseAiMoney = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return round2(value);
  const raw = String(value).trim();
  if (!raw) return null;
  const cleaned = raw.replace(/R\$|\s/g, "");
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const normalized = lastComma > -1 && lastDot > -1
    ? lastComma > lastDot
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/,/g, "")
    : cleaned.includes(",")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned;
  const n = Number(normalized);
  return Number.isFinite(n) ? round2(n) : null;
};

const extractJson = (text: string): any => {
  const cleaned = String(text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  const s = cleaned.indexOf("{");
  const e = cleaned.lastIndexOf("}");
  if (s === -1 || e === -1) throw new Error("Resposta da IA sem JSON.");
  return JSON.parse(cleaned.slice(s, e + 1));
};

async function processUpload(uploadId: string) {
  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
  try {
    const { data: up, error: upErr } = await supa
      .from("folha_uploads")
      .select("*")
      .eq("id", uploadId)
      .maybeSingle();
    if (upErr || !up) throw new Error("Upload não encontrado.");

    await supa.from("folha_uploads").update({
      status: "transcrevendo",
      ultimo_erro: null,
      total_rendimentos_documento: null,
      total_descontos_documento: null,
      total_liquido_documento: null,
      total_recol_fgts_documento: null,
      total_rendimentos_lancamentos: null,
      total_descontos_lancamentos: null,
      total_liquido_lancamentos: null,
      observacoes_ia: null,
    }).eq("id", up.id);

    await supa.from("folha_lancamentos").delete().eq("source_upload_id", up.id);
    await supa.from("folha_transcricoes").delete().eq("upload_id", up.id);

    const { data: file, error: dlErr } = await supa.storage.from("lancamentos").download(up.storage_path);
    if (dlErr) throw dlErr;
    const buf = new Uint8Array(await file.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const b64 = btoa(bin);

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY! },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: `Competência: ${up.competencia}\n\nDigitalize a tabela de eventos da folha de pagamento no PDF anexo. Copie linha por linha, sem somar, sem inventar, sem corrigir. Devolva o JSON conforme instruído.` },
              { type: "file", file: { filename: up.nome_arquivo, file_data: `data:application/pdf;base64,${b64}` } },
            ],
          },
        ],
      }),
    });

    if (aiRes.status === 429) throw new Error("Limite de requisições atingido. Tente novamente em alguns instantes.");
    if (aiRes.status === 402) throw new Error("Créditos da IA esgotados. Adicione créditos no workspace.");
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      throw new Error(`IA Gateway erro ${aiRes.status}: ${errText.slice(0, 200)}`);
    }
    const aiJson = await aiRes.json();
    const finishReason = aiJson?.choices?.[0]?.finish_reason;
    if (finishReason === "length" || finishReason === "max_tokens") {
      throw new Error("A resposta da IA foi cortada. Reprocesse o documento.");
    }
    const parsed = extractJson(aiJson?.choices?.[0]?.message?.content ?? "");

    const linhas = Array.isArray(parsed.linhas) ? parsed.linhas.map((l: any) => ({
      codigo: l.codigo != null ? String(l.codigo).trim() : null,
      descricao: String(l.descricao ?? "").trim(),
      referencia: l.referencia != null ? String(l.referencia).trim() : null,
      rendimento: parseAiMoney(l.rendimento),
      desconto: parseAiMoney(l.desconto),
      recol_fgts: parseAiMoney(l.recol_fgts),
    })) : [];

    const total_rendimentos_pdf = parseAiMoney(parsed.total_rendimentos_pdf);
    const total_descontos_pdf = parseAiMoney(parsed.total_descontos_pdf);
    const total_recol_fgts_pdf = parseAiMoney(parsed.total_recol_fgts_pdf);
    const observacoes_ia = typeof parsed.observacoes_ia === "string" ? parsed.observacoes_ia.trim() : "";

    const sumRend = round2(linhas.reduce((a: number, l: any) => a + (l.rendimento ?? 0), 0));
    const sumDesc = round2(linhas.reduce((a: number, l: any) => a + (l.desconto ?? 0), 0));
    const sumFgts = round2(linhas.reduce((a: number, l: any) => a + (l.recol_fgts ?? 0), 0));

    const problemas: string[] = [];
    if (total_rendimentos_pdf == null) problemas.push("total de rendimentos do PDF não identificado");
    if (total_descontos_pdf == null) problemas.push("total de descontos do PDF não identificado");
    if (total_rendimentos_pdf != null && Math.abs(sumRend - total_rendimentos_pdf) > 0.01) {
      problemas.push(`rendimentos: soma das linhas ${sumRend.toFixed(2)} ≠ total do PDF ${total_rendimentos_pdf.toFixed(2)} (dif ${(sumRend - total_rendimentos_pdf).toFixed(2)})`);
    }
    if (total_descontos_pdf != null && Math.abs(sumDesc - total_descontos_pdf) > 0.01) {
      problemas.push(`descontos: soma das linhas ${sumDesc.toFixed(2)} ≠ total do PDF ${total_descontos_pdf.toFixed(2)} (dif ${(sumDesc - total_descontos_pdf).toFixed(2)})`);
    }
    if (total_recol_fgts_pdf != null && Math.abs(sumFgts - total_recol_fgts_pdf) > 0.01) {
      problemas.push(`Recol FGTS: soma das linhas ${sumFgts.toFixed(2)} ≠ total do PDF ${total_recol_fgts_pdf.toFixed(2)}`);
    }

    const status = problemas.length ? "erro_transcricao" : "transcrito";
    const erro = problemas.length
      ? `A IA não transcreveu o PDF corretamente: ${problemas.join("; ")}. Reprocesse o documento.`
      : null;

    const { data: trans, error: transErr } = await supa
      .from("folha_transcricoes")
      .insert({
        upload_id: up.id,
        client_id: up.client_id,
        competencia: up.competencia,
        linhas,
        total_rendimentos_pdf,
        total_descontos_pdf,
        total_recol_fgts_pdf,
        status,
        erro,
        observacoes_ia: observacoes_ia || null,
      })
      .select()
      .single();
    if (transErr) throw transErr;

    await supa.from("folha_uploads").update({
      status,
      ultimo_erro: erro,
      total_rendimentos_documento: total_rendimentos_pdf,
      total_descontos_documento: total_descontos_pdf,
      total_liquido_documento: (total_rendimentos_pdf != null && total_descontos_pdf != null)
        ? round2(total_rendimentos_pdf - total_descontos_pdf) : null,
      total_recol_fgts_documento: total_recol_fgts_pdf,
      observacoes_ia: observacoes_ia || null,
    }).eq("id", up.id);

    if (status === "transcrito") {
      fetch(`${SUPABASE_URL}/functions/v1/contabilizar-folha`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE}`,
        },
        body: JSON.stringify({ transcricaoId: trans.id }),
      }).catch((e) => console.error("Falha ao disparar contabilizar-folha", e));
    }
  } catch (e: any) {
    console.error("transcrever-folha background error", e);
    await supa.from("folha_uploads").update({
      status: "erro_transcricao",
      ultimo_erro: String(e.message || e).slice(0, 500),
    }).eq("id", uploadId);
  }
}

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

    // Marca como transcrevendo imediatamente e dispara o processamento em background
    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
    await supa.from("folha_uploads").update({
      status: "transcrevendo",
      ultimo_erro: null,
    }).eq("id", uploadId);

    // @ts-ignore - EdgeRuntime é disponível no runtime do Supabase
    EdgeRuntime.waitUntil(processUpload(uploadId));

    return new Response(JSON.stringify({ success: true, status: "transcrevendo", uploadId }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("transcrever-folha error", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

