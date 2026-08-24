import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Não autenticado" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Não autenticado" }, 401);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((row: any) => ["admin", "fiscal", "contabil", "geral"].includes(row.role))) return json({ error: "Acesso negado" }, 403);

    const body = await req.json();
    const groups = Array.isArray(body.groups) ? body.groups.slice(0, 300) : [];
    if (!groups.length) return json({ groups: [] });
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "OPENAI_API_KEY não configurada" }, 503);
    const model = Deno.env.get("OPENAI_EXPENSE_ALIGNMENT_MODEL") || "gpt-5.6-luna";
    const schema = { type: "object", additionalProperties: false, properties: { groups: { type: "array", items: { type: "object", additionalProperties: false, properties: { id: { type: "string" }, history: { type: "string" } }, required: ["id", "history"] } } }, required: ["groups"] };
    const instructions = `Ajuste SOMENTE o histórico de grupos de despesas já contabilizados no Calima. Não altere contas, C.C., valores nem agrupamentos. Use CAIXA ALTA, texto curto e profissional. Para pagamentos use preferencialmente PAGTO. ..., como PAGTO. FORNECEDORES, PAGTO. DESPESAS COM VEICULOS, PAGTO. IMPOSTOS, TAXAS E CONTRIBUIÇÕES. Preserve FGTS, folha, competência e natureza específica quando sustentados pelos históricos originais. Não invente fornecedor, banco, documento ou finalidade. Retorne um item por id.`;
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, instructions, input: [{ role: "user", content: [{ type: "input_text", text: JSON.stringify(groups) }] }], text: { format: { type: "json_schema", name: "expense_alignment", strict: true, schema } }, max_output_tokens: 6000 }), signal: AbortSignal.timeout(90000) });
    const raw = await response.json();
    if (!response.ok) throw new Error(raw?.error?.message || "Falha no alinhamento de despesas");
    const text = raw.output_text || raw.output?.flatMap((item: any) => item.content ?? []).find((item: any) => item.type === "output_text")?.text;
    if (!text) throw new Error("A IA não retornou os históricos alinhados.");
    return json({ ...JSON.parse(text), model: raw.model || model });
  } catch (error) {
    console.error("align-expense-entries", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
