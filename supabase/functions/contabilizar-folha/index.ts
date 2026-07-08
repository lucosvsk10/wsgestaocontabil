import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { planoContasForAI } from "../_shared/planoContas.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM_PROMPT = `Você é um CONTABILIZADOR de folha de pagamento. Você NÃO tem acesso ao PDF original. Você recebe apenas uma TABELA JÁ TRANSCRITA e o PLANO DE CONTAS da empresa.

REGRAS ABSOLUTAS:
- Use SOMENTE os valores que estão na tabela transcrita. NUNCA recalcule, arredonde, invente linha nova ou descarte linha existente.
- A soma dos lançamentos de tipo "rendimento" deve ser exatamente igual ao total de rendimentos da tabela. A soma dos lançamentos de tipo "desconto" deve ser exatamente igual ao total de descontos da tabela.
- Para cada verba da tabela, escolha uma conta de débito e uma conta de crédito no plano de contas (use apenas os C.R. — códigos reduzidos — que existem no plano).
- Você pode agrupar linhas com a MESMA combinação [Débito + Crédito]. Nesse caso o valor final é a soma exata das verbas agrupadas e a justificativa lista cada verba somada com seu valor.
- Se uma verba não tiver conta correspondente no plano, gere a linha com conta_debito=null ou conta_credito=null (conforme o caso) e prefixe o histórico com "[REVISAR] ".
- Se encontrou uma conta plausível mas com dúvida semântica, prefixe o histórico com "[SUGERIDO] ".
- Data de cada lançamento: último dia real do mês da competência (DD/MM/AAAA).

### REGRAS DE AGRUPAMENTO / MAPEAMENTO
<!-- Bloco a ser preenchido com regras específicas de agrupamento e mapeamento por natureza de conta -->

### FORMATO DE RETORNO (JSON estrito, sem markdown)
{
  "observacoes_ia": "STRING",
  "lancamentos": [
    { "data": "DD/MM/AAAA", "conta_debito": "STRING_OU_NULL", "conta_credito": "STRING_OU_NULL", "historico": "STRING", "valor": NUMBER, "tipo": "rendimento|desconto|encargo", "justificativa": "STRING" }
  ]
}`;

const round2 = (n: number) => Math.round(n * 100) / 100;

const lastDayOfCompetencia = (competencia: string): string | null => {
  const m = String(competencia).match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${m[1]}-${m[2]}-${String(lastDay).padStart(2, "0")}`;
};

const parseDateBR = (s: string): string | null => {
  const m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");
    const { transcricaoId } = await req.json();
    if (!transcricaoId) {
      return new Response(JSON.stringify({ error: "transcricaoId obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: trans, error: transErr } = await supa
      .from("folha_transcricoes")
      .select("*")
      .eq("id", transcricaoId)
      .maybeSingle();
    if (transErr || !trans) throw new Error("Transcrição não encontrada.");
    if (trans.status === "erro_transcricao") {
      throw new Error("Transcrição com erro. Reprocesse o PDF antes de contabilizar.");
    }

    await supa.from("folha_uploads").update({ status: "contabilizando", ultimo_erro: null }).eq("id", trans.upload_id);
    await supa.from("folha_transcricoes").update({ status: "contabilizando", erro: null }).eq("id", trans.id);

    // Apaga lançamentos existentes deste upload
    await supa.from("folha_lancamentos").delete().eq("source_upload_id", trans.upload_id);

    const { data: planoRow } = await supa
      .from("planos_contas")
      .select("conteudo")
      .eq("user_id", trans.client_id)
      .maybeSingle();

    let planoText = "[PLANO DE CONTAS não cadastrado para esta empresa]";
    if (planoRow?.conteudo) {
      const { text } = planoContasForAI(planoRow.conteudo);
      if (text) planoText = "[PLANO DE CONTAS]\n" + text;
    }

    const tabelaTexto = [
      "Cód. | Descrição | Referência | Rendimentos | Descontos | Recol FGTS",
      ...(trans.linhas as any[]).map((l) => [
        l.codigo ?? "",
        l.descricao ?? "",
        l.referencia ?? "",
        l.rendimento != null ? l.rendimento.toFixed(2) : "",
        l.desconto != null ? l.desconto.toFixed(2) : "",
        l.recol_fgts != null ? l.recol_fgts.toFixed(2) : "",
      ].join(" | ")),
      "---",
      `TOTAL RENDIMENTOS: ${trans.total_rendimentos_pdf != null ? Number(trans.total_rendimentos_pdf).toFixed(2) : "null"}`,
      `TOTAL DESCONTOS: ${trans.total_descontos_pdf != null ? Number(trans.total_descontos_pdf).toFixed(2) : "null"}`,
      `TOTAL RECOL FGTS: ${trans.total_recol_fgts_pdf != null ? Number(trans.total_recol_fgts_pdf).toFixed(2) : "null"}`,
    ].join("\n");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Competência: ${trans.competencia}\n\n${planoText}\n\n[TABELA TRANSCRITA]\n${tabelaTexto}\n\nGere os lançamentos contábeis usando SOMENTE os valores acima.` },
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
      throw new Error("A resposta da IA foi cortada. Reprocesse a contabilização.");
    }
    const parsed = extractJson(aiJson?.choices?.[0]?.message?.content ?? "");
    const lancs = Array.isArray(parsed.lancamentos) ? parsed.lancamentos : [];
    const observacoes_ia = typeof parsed.observacoes_ia === "string" ? parsed.observacoes_ia.trim() : "";

    const fallbackDate = lastDayOfCompetencia(trans.competencia);
    const isValidISO = (d: string | null) => {
      if (!d) return false;
      const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) return false;
      const y = Number(m[1]), mo = Number(m[2]), da = Number(m[3]);
      const dt = new Date(Date.UTC(y, mo - 1, da));
      return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === da;
    };

    const rows = lancs.map((l: any, idx: number) => {
      const parsedDate = parseDateBR(l.data);
      const data = isValidISO(parsedDate) ? parsedDate : fallbackDate;
      const rawHist = String(l.historico || "").trim();
      const historico = rawHist ? rawHist.replace(/\s+/g, " ").toUpperCase() : "";
      const justificativa = l.justificativa != null && String(l.justificativa).trim() !== ""
        ? String(l.justificativa).trim()
        : null;
      return {
        client_id: trans.client_id,
        competencia: trans.competencia,
        data,
        conta_debito: l.conta_debito != null && String(l.conta_debito).trim() !== "" ? String(l.conta_debito).trim() : null,
        conta_credito: l.conta_credito != null && String(l.conta_credito).trim() !== "" ? String(l.conta_credito).trim() : null,
        historico,
        justificativa,
        valor: parseAiMoney(l.valor) ?? 0,
        ordem: idx,
        source_upload_id: trans.upload_id,
      };
    }).filter((r: any) => r.valor > 0);

    if (rows.length) {
      const { error: insErr } = await supa.from("folha_lancamentos").insert(rows);
      if (insErr) throw insErr;
    }

    const sumRend = round2(rows.filter((r: any) => /rendimento/.test(String(r.historico))).reduce((a: number, r: any) => a + Number(r.valor || 0), 0));
    const sumDesc = round2(rows.filter((r: any) => /desconto/.test(String(r.historico))).reduce((a: number, r: any) => a + Number(r.valor || 0), 0));

    await supa.from("folha_transcricoes").update({
      status: "contabilizado",
      erro: null,
      observacoes_ia: observacoes_ia || trans.observacoes_ia,
    }).eq("id", trans.id);

    await supa.from("folha_uploads").update({
      status: "processado",
      ultimo_erro: null,
      observacoes_ia: observacoes_ia || null,
      total_rendimentos_lancamentos: sumRend || null,
      total_descontos_lancamentos: sumDesc || null,
      total_liquido_lancamentos: (sumRend || sumDesc) ? round2(sumRend - sumDesc) : null,
    }).eq("id", trans.upload_id);

    return new Response(JSON.stringify({ success: true, total_lancamentos: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("contabilizar-folha error", e);
    try {
      const body = await req.clone().json().catch(() => ({} as any));
      if (body?.transcricaoId) {
        const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
        const { data: t } = await supa.from("folha_transcricoes").select("upload_id").eq("id", body.transcricaoId).maybeSingle();
        await supa.from("folha_transcricoes").update({
          status: "erro_contabilizacao",
          erro: String(e.message || e).slice(0, 500),
        }).eq("id", body.transcricaoId);
        if (t?.upload_id) {
          await supa.from("folha_uploads").update({
            status: "erro",
            ultimo_erro: String(e.message || e).slice(0, 500),
          }).eq("id", t.upload_id);
        }
      }
    } catch { /* ignore */ }
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
