import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const round2 = (n: number) => Math.round(n * 100) / 100;

const lastDayOfCompetencia = (competencia: string): string | null => {
  const m = String(competencia).match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  const lastDay = new Date(Date.UTC(Number(m[1]), Number(m[2]), 0)).getUTCDate();
  return `${m[1]}-${m[2]}-${String(lastDay).padStart(2, "0")}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { uploadId, linhas } = await req.json();
    if (!uploadId || !Array.isArray(linhas)) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: up, error: upErr } = await supa
      .from("compras_uploads").select("*").eq("id", uploadId).maybeSingle();
    if (upErr || !up) throw new Error("Upload não encontrado");

    const cfops = [...new Set(linhas.map((l: any) => String(l.cfop)).filter(Boolean))];
    const { data: mapping, error: mErr } = await supa
      .from("compras_cfop_mapping").select("*")
      .eq("client_id", up.client_id).in("cfop", cfops);
    if (mErr) throw mErr;
    const mapByCfop = new Map<string, any>((mapping || []).map((m: any) => [String(m.cfop), m]));

    const faltando = cfops.filter((c) => !mapByCfop.has(c));
    if (faltando.length) {
      return new Response(JSON.stringify({
        error: "cfop_nao_mapeado",
        message: `CFOP(s) sem mapeamento contábil: ${faltando.join(", ")}. Configure em "Mapear CFOPs".`,
        cfops_faltando: faltando,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = lastDayOfCompetencia(up.competencia);
    const mm = up.competencia.slice(5, 7);
    const aaaa = up.competencia.slice(0, 4);
    const sufixo = `MÊS ${mm}/${aaaa}`;

    // Remove lançamentos anteriores deste upload (re-confirmação)
    await supa.from("compras_lancamentos").delete().eq("source_upload_id", up.id);

    const rows = linhas
      .filter((l: any) => Number(l.vr_contabil) > 0)
      .map((l: any, idx: number) => {
        const map = mapByCfop.get(String(l.cfop));
        const desc = String(l.descricao || "").toUpperCase().trim();
        return {
          client_id: up.client_id,
          competencia: up.competencia,
          data,
          conta_debito: String(map.conta_debito),
          conta_credito: String(map.conta_credito),
          cfop: String(l.cfop),
          historico: `${desc} - ${sufixo}`,
          valor: round2(Number(l.vr_contabil)),
          ordem: idx,
          source_upload_id: up.id,
        };
      });

    if (rows.length) {
      const { error: insErr } = await supa.from("compras_lancamentos").insert(rows);
      if (insErr) throw insErr;
    }

    await supa.from("compras_uploads").update({ status: "lancado" }).eq("id", up.id);

    return new Response(JSON.stringify({ success: true, total: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("confirm-compras-lancamentos", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
