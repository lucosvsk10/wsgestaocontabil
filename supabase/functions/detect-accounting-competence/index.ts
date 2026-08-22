import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    competences: { type: "array", items: { type: "string" } },
    hasUndatedPeriodicBlocks: { type: "boolean" },
    undatedBlockCount: { type: "integer" },
    evidence: { type: "array", items: { type: "string" } },
    warning: { type: "string" },
  },
  required: ["competences", "hasUndatedPeriodicBlocks", "undatedBlockCount", "evidence", "warning"],
};

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
    if (!Array.isArray(body.documents) || !body.documents.length) return json({ error: "Nenhum documento" }, 400);
    const module = String(body.module || "");
    if (!["folha", "compras", "faturamento", "despesas"].includes(module)) return json({ error: "Módulo inválido" }, 400);

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "OPENAI_API_KEY não configurada" }, 503);
    const model = Deno.env.get("OPENAI_ACCOUNTING_COMPETENCE_MODEL") || "gpt-5.6-luna";
    const files = body.documents.map((document: any) => ({
      type: "input_file",
      filename: document.name,
      file_data: `data:${document.mime_type};base64,${document.data}`,
    }));

    const instructions = `Você é um detector documental de competência contábil. Sua única tarefa é identificar mês/ano a partir do CONTEÚDO VISÍVEL do documento.

REGRAS ABSOLUTAS:
1. IGNORE completamente o nome do arquivo, a pasta, a competência atualmente aberta no sistema e qualquer data fornecida fora do documento.
2. Retorne em competences TODAS as competências mensais explicitamente sustentadas pelo conteúdo, no formato MM/AAAA, sem duplicar.
3. Para folha de pagamento, procure cabeçalhos como competência, período, mês de referência, folha mensal, demonstrativo, resumo de INSS/FGTS e datas claramente ligadas ao período da folha. Uma data de pagamento isolada não deve substituir a competência explícita.
4. Se o documento disser claramente fevereiro/2024, 02/2024 ou equivalente, retorne 02/2024 mesmo que o sistema esteja aberto em outro mês.
5. Se houver vários meses, retorne todos em ordem cronológica.
6. Se NÃO houver mês/ano confiável, competences deve ficar vazio. Nunca invente competência.
7. Se existirem blocos periódicos repetidos sem data confiável (por exemplo 12 blocos/linhas que parecem meses), marque hasUndatedPeriodicBlocks=true e informe a quantidade em undatedBlockCount. NÃO associe Bloco 1 a janeiro automaticamente.
8. evidence deve conter evidências curtas do documento que justificam cada competência. Não invente texto.
9. warning deve ser vazio quando a leitura for clara e explicar brevemente a ambiguidade quando não for.`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        instructions,
        input: [{ role: "user", content: [{ type: "input_text", text: `Identifique apenas a competência documental do módulo ${module}.` }, ...files] }],
        text: { format: { type: "json_schema", name: "accounting_competence_detection", strict: true, schema } },
        max_output_tokens: 1200,
      }),
      signal: AbortSignal.timeout(90000),
    });
    const raw = await response.json();
    if (!response.ok) throw new Error(raw?.error?.message || "Falha ao detectar competência");
    const text = raw.output_text || raw.output?.flatMap((item: any) => item.content ?? []).find((item: any) => item.type === "output_text")?.text;
    if (!text) throw new Error("A detecção de competência não devolveu saída estruturada.");
    const parsed = JSON.parse(text);
    const valid = [...new Set((parsed.competences ?? []).map(String).filter((value: string) => /^(0[1-9]|1[0-2])\/(20\d{2})$/.test(value)))];

    return json({
      competences: valid,
      hasUndatedPeriodicBlocks: Boolean(parsed.hasUndatedPeriodicBlocks),
      undatedBlockCount: Math.max(0, Number(parsed.undatedBlockCount || 0)),
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence.map(String) : [],
      warning: String(parsed.warning || ""),
      model: raw.model || model,
    });
  } catch (error) {
    console.error("detect-accounting-competence", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
