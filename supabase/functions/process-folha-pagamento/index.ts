import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { planoContasForAI } from "../_shared/planoContas.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM_PROMPT = `Você é o motor de inteligência contábil de um sistema de gestão de documentos. Sua função é analisar relatórios de Folha de Pagamento (PDF) e transformá-los em lotes de lançamentos otimizados para o Calima ERP.

Você DEVE cruzar cada evento da folha com o [PLANO DE CONTAS] enviado no contexto desta requisição. O plano de contas usa APENAS o C.R. (código reduzido) — NÃO existe "código completo", "código contábil" ou "conta analítica". Use SEMPRE, e somente, os CRs que aparecem no [PLANO DE CONTAS]. NUNCA invente um CR que não esteja lá.

### PRINCÍPIO DA CONCILIAÇÃO DINÂMICA (por NATUREZA da conta)
Para cada evento, identifique a NATUREZA contábil e depois escolha, no plano de contas da empresa, o CR cuja descrição corresponda a essa natureza. Categorias:

A. DESPESA DE SALÁRIOS DE FUNCIONÁRIOS — descrições como "SALARIOS E ORDENADOS", "SALÁRIOS", "REMUNERAÇÃO DE FUNCIONÁRIOS", "MÃO DE OBRA".
B. DESPESA DE PRÓ-LABORE — descrições como "PRO-LABORE", "HONORARIOS DA DIRETORIA", "REMUNERAÇÃO DE SÓCIOS/ADMINISTRADORES".
C. DESPESA DE FGTS — descrições como "FGTS", "FGTS S/FOLHA".
D. DESPESA DE INSS PATRONAL — descrições como "INSS PATRONAL", "CONTRIBUIÇÃO PREVIDENCIARIA EMPRESA".
E. PASSIVO — SALÁRIOS A PAGAR — descrições como "SALARIOS A PAGAR", "ORDENADOS A PAGAR", "SALARIOS E REMUNERAÇÕES A PAGAR".
F. PASSIVO — PRO-LABORE A PAGAR — descrições como "PRO-LABORE A PAGAR", "HONORARIOS A PAGAR".
G. OBRIGAÇÃO — INSS A RECOLHER — descrições como "INSS A RECOLHER", "CONTRIBUIÇÃO PREVIDENCIARIA A RECOLHER".
H. OBRIGAÇÃO — FGTS A RECOLHER — descrições como "FGTS A RECOLHER".
I. OBRIGAÇÃO — IRRF A RECOLHER — descrições como "IRRF A RECOLHER", "IMPOSTO DE RENDA RETIDO".
J. PASSIVO — CONSIGNADO / EMPRÉSTIMOS EM FOLHA — descrições como "EMPRESTIMOS CONSIGNADOS", "CONSIGNADO A PAGAR", "CONTAS A PAGAR".
K. PASSIVO — PENSÃO / SINDICATO / OUTROS DESCONTOS DE TERCEIROS — descrições como "PENSAO ALIMENTICIA A PAGAR", "CONTRIBUIÇÃO SINDICAL A PAGAR", "CONVENIO A PAGAR".

Para cada categoria, escolha o CR do plano de contas cuja descrição melhor corresponda semanticamente. NÃO use códigos que não existam no plano de contas fornecido.

### REGRAS DE LANÇAMENTO

1. REMUNERAÇÕES REGULARES (Salários, Médias, Gratificações, Salário Família, Ajuda de Custo) → Débito em (A), Crédito em (E). Histórico: "SALARIOS E REMUNERAÇÕES A PAGAR".
2. PRÓ-LABORE DOS SÓCIOS → Débito em (B), Crédito em (F). Histórico: "PRO-LABORE A PAGAR MÊS [MM/AAAA]".
3. VERBAS RESCISÓRIAS GERAIS DE FUNCIONÁRIOS (Saldo de Salário, Aviso Prévio, 13º Rescisão) → Débito em (A), Crédito em (E). Histórico: "RECISAO A PAGAR MÊS [MM/AAAA]".
4. FÉRIAS NA RESCISÃO / INDENIZADAS → Débito em (A), Crédito em (E). Histórico: "FERIAS A PAGAR MÊS DE [MM/AAAA] (RECISÃO)".
5. RETENÇÕES DE INSS:
   - Sobre Salários → Débito em (E) e Crédito em (G). Histórico: "INSS S/SALÁRIOS A PAGAR MÊS [MM/AAAA]".
   - Sobre Pró-labore → Débito em (F) e Crédito em (G). Histórico: "INSS S/PRO-LABORE (SOCIO) A PAGAR MÊS [MM/AAAA]".
   - Sobre 13º de Rescisão → Débito em (E) e Crédito em (G). Histórico: "INSS S/13º SALARIO - RECISÃO A PAGAR MÊS DE [MM/AAAA]".
6. FGTS DA EMPRESA → Débito em (C) e Crédito em (H). Histórico: "FGTS A PAGAR MÊS [MM/AAAA]".
7. IRRF RETIDO EM FOLHA → Débito em (E) e Crédito em (I). Histórico: "IRRF S/SALÁRIOS A PAGAR MÊS [MM/AAAA]".
8. RETENÇÕES DIVERSAS (consignado, pensão, sindicato, convênio, empréstimos, descontos comerciais de terceiros): Débito em (E) e Crédito na obrigação correspondente (J, K, ou similar do plano). Histórico: "[NOME DO DESCONTO] EM FOLHA MÊS [MM/AAAA]" (ex.: "EMPRESTIMO CONSIGNADO EM FOLHA MÊS 03/2026").

Agrupe linhas com a MESMA combinação [Conta Débito + Conta Crédito] somando os valores, desde que a soma final continue batendo exatamente com os totais oficiais do PDF.

### TIPO DE CADA LANÇAMENTO (OBRIGATÓRIO PARA CONFERÊNCIA)
Para CADA lançamento, informe também o campo "tipo" com um destes valores:
- "rendimento": proventos/remunerações que compõem o total de rendimentos/proventos do PDF (salários, pró-labore, férias, rescisões, 13º, médias, gratificações, salário família, ajuda de custo, etc.).
- "desconto": descontos/retenções que compõem o total de descontos do PDF (INSS descontado, IRRF, consignado, pensão, sindicato, convênios, empréstimos, vale/transporte descontado, etc.).
- "encargo": encargos da empresa que NÃO compõem o total de rendimentos nem o total de descontos do trabalhador no PDF (FGTS da empresa, INSS patronal, outras obrigações patronais).

Nunca use "encargo" para esconder diferença. Se uma verba aparece no total de rendimentos ou descontos do PDF, classifique como "rendimento" ou "desconto".

### VERBAS NOVAS / NÃO PREVISTAS (IMPORTANTE)
A folha pode trazer eventos não listados acima (auxílios, benefícios, prêmios, descontos específicos, adicionais, etc.). Nesses casos:
1. Identifique a natureza contábil (é despesa? passivo a pagar? obrigação a recolher?).
2. Procure no plano de contas o CR cuja DESCRIÇÃO seja SEMANTICAMENTE MAIS PRÓXIMA. Use tokens como "auxilio", "beneficio", "premio", "adicional", "vale", "diaria", etc.
3. Se encontrar um CR plausível, use-o normalmente MAS prefixe o histórico com "[SUGERIDO] " para o usuário revisar.
4. Se NENHUM CR do plano se aplicar, gere a linha com "conta_debito": null e "conta_credito": null (o que couber ficar em branco) e prefixe o histórico com "[REVISAR] " descrevendo a verba.

Isso vale para AMBOS os lados (débito e crédito). NUNCA descarte um valor da folha silenciosamente.

### JUSTIFICATIVA POR LINHA (OBRIGATÓRIO)
Para CADA lançamento, preencha o campo "justificativa" com uma explicação curta e objetiva de onde aquele valor foi extraído do PDF:
- Nome da seção do relatório de onde saiu (ex.: "Resumo de Proventos", "Descontos", "Verbas Rescisórias").
- Se a linha unificou várias verbas, LISTE as verbas somadas com seus valores individuais. Ex.: "Soma de SALÁRIO BASE (R$ 12.340,00) + AJUDA DE CUSTO (R$ 400,00) + SALÁRIO FAMÍLIA (R$ 62,00)".
- Se marcou [SUGERIDO], explique brevemente qual verba original justificou a escolha do CR mais próximo.
- Se marcou [REVISAR], descreva a verba encontrada no PDF que não teve conta correspondente.
- Seja curto (1-3 linhas). Sem juridiquês.

### OBSERVAÇÕES GERAIS DA IA (OBRIGATÓRIO)
No topo do JSON, o campo "observacoes_ia" (string única, pode ser vazia "") serve para você registrar dúvidas, casos incomuns, ou justificativas de decisões não óbvias tomadas durante o processamento — coisas que o usuário humano precisa saber ao revisar. Exemplos: valor que não bateu na conferência matemática, verba nova encontrada e como você tratou, retenção incomum, competência divergente entre páginas, etc. Se não houver nada a comentar, deixe "".

### TOTAIS OFICIAIS DO DOCUMENTO (OBRIGATÓRIO)
No topo do JSON, informe os totais oficiais COPIADOS do resumo/totalizador do PDF:
- "total_rendimentos_documento": total de rendimentos/proventos exatamente como aparece no PDF.
- "total_descontos_documento": total de descontos exatamente como aparece no PDF.
- "total_liquido_documento": total líquido exatamente como aparece no PDF, ou null se o PDF realmente não trouxer esse total.

Esses totais NÃO são para você calcular. Eles devem vir do documento original. Se não conseguir identificar o total de rendimentos ou descontos no PDF, retorne null no campo correspondente, marque observacoes_ia explicando e NÃO chute.

### FIDELIDADE ABSOLUTA AOS VALORES DO PDF (REGRA MAIS IMPORTANTE)
- Copie os valores EXATAMENTE como aparecem no PDF. NUNCA arredonde, estime, complete ou "corrija" valores.
- Se você agrupar linhas com a mesma combinação [Conta Débito + Conta Crédito], o valor final DEVE ser a soma aritmética EXATA das verbas listadas na justificativa (centavo por centavo).
- A soma de todos os lançamentos com tipo "rendimento" DEVE bater com "total_rendimentos_documento".
- A soma de todos os lançamentos com tipo "desconto" DEVE bater com "total_descontos_documento".
- Se "total_liquido_documento" existir, ele DEVE bater com rendimentos menos descontos.
- Se um valor no PDF for R$ 1.234,56, use 1234.56 — nem 1234.55, nem 1234.60, nem 1234.
- Não invente linhas que não estejam no PDF. Não descarte linhas que estejam no PDF.
- Se algo estiver ilegível ou ambíguo, marque com [REVISAR] e explique na justificativa — não chute.

### FORMATAÇÃO
- Data: último dia real do mês da competência (DD/MM/AAAA).
- Históricos: em CAIXA ALTA (menos os prefixos "[SUGERIDO] " e "[REVISAR] " que ficam entre colchetes). Substitua "[MM/AAAA]" pela competência real.
- Valores: numéricos limpos (float). Não gere linha com valor zero.

### FORMATO DO RETORNO (JSON STRICT)
Retorne ESTRITAMENTE um objeto JSON:
{
  "observacoes_ia": "STRING",
  "total_rendimentos_documento": NUMBER_OR_NULL,
  "total_descontos_documento": NUMBER_OR_NULL,
  "total_liquido_documento": NUMBER_OR_NULL,
  "lancamentos": [
    { "data": "DD/MM/AAAA", "conta_debito": "STRING_OR_NULL", "conta_credito": "STRING_OR_NULL", "historico": "STRING", "valor": NUMBER, "tipo": "rendimento|desconto|encargo", "justificativa": "STRING" }
  ]
}`;

const TOTALS_PROMPT = `Você é um auditor de folha de pagamento. Sua única função é localizar no PDF os totais oficiais do resumo/totalizador da folha.

Retorne ESTRITAMENTE um objeto JSON, sem markdown e sem texto fora do JSON:
{
  "total_rendimentos_documento": NUMBER_OR_NULL,
  "total_descontos_documento": NUMBER_OR_NULL,
  "total_liquido_documento": NUMBER_OR_NULL,
  "observacoes_ia": "STRING"
}

Regras:
- Copie os totais exatamente como aparecem no PDF.
- Não calcule, não estime e não some verbas avulsas para preencher total ausente.
- Rendimentos/proventos = total oficial de proventos/rendimentos do trabalhador/folha.
- Descontos = total oficial de descontos/retenções.
- Líquido = total líquido, se houver.
- Se algum total não estiver explícito, use null e explique em observacoes_ia.`;


const parseDateBR = (s: string): string | null => {
  const m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

// Último dia real do mês da competência (YYYY-MM) -> YYYY-MM-DD
const lastDayOfCompetencia = (competencia: string): string | null => {
  const m = String(competencia).match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]); // 1-12
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${m[1]}-${m[2]}-${String(lastDay).padStart(2, "0")}`;
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

const extractAiPayload = (text: string): {
  lancamentos: any[];
  observacoes_ia: string;
  total_rendimentos_documento: number | null;
  total_descontos_documento: number | null;
  total_liquido_documento: number | null;
} => {
  const cleaned = String(text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  let parsed: any = null;
  const objStart = cleaned.indexOf("{");
  const objEnd = cleaned.lastIndexOf("}");
  if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
    try { parsed = JSON.parse(cleaned.slice(objStart, objEnd + 1)); } catch { /* ignore */ }
  }
  if (!parsed) {
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start !== -1 && end !== -1 && end > start) {
      try { parsed = { lancamentos: JSON.parse(cleaned.slice(start, end + 1)) }; } catch { /* ignore */ }
    }
  }
  if (!parsed) throw new Error(`Resposta da IA inválida. Trecho: ${cleaned.slice(0, 300)}`);

  let lancamentos: any[] = [];
  if (Array.isArray(parsed)) lancamentos = parsed;
  else if (Array.isArray(parsed.lancamentos)) lancamentos = parsed.lancamentos;
  else {
    for (const k of Object.keys(parsed)) {
      if (Array.isArray(parsed[k])) { lancamentos = parsed[k]; break; }
    }
  }

  const observacoes_ia = typeof (parsed as any)?.observacoes_ia === "string"
    ? String((parsed as any).observacoes_ia).trim()
    : "";
  return {
    lancamentos,
    observacoes_ia,
    total_rendimentos_documento: parseAiMoney((parsed as any)?.total_rendimentos_documento),
    total_descontos_documento: parseAiMoney((parsed as any)?.total_descontos_documento),
    total_liquido_documento: parseAiMoney((parsed as any)?.total_liquido_documento),
  };
};

const round2 = (n: number) => Math.round(n * 100) / 100;

type FolhaTipo = "rendimento" | "desconto" | "encargo";

const classifyLancamento = (l: any): FolhaTipo => {
  const tipo = String(l?.tipo || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (tipo === "rendimento" || tipo === "desconto" || tipo === "encargo") return tipo as FolhaTipo;

  const hist = String(l?.historico || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (/(INSS\s*S\/|IRRF|CONSIGN|PENSAO|SINDICAL|CONVENIO|EMPRESTIMO|VALE|^\s*DESC)/.test(hist)) return "desconto";
  if (/(FGTS|INSS\s+PATRONAL|INSS\s+EMPRESA|CONTRIBUICAO\s+PREVIDENCIARIA.*EMPRESA)/.test(hist)) return "encargo";
  return "rendimento";
};

const validateFolhaTotals = (
  lancamentos: any[],
  totals: {
    total_rendimentos_documento: number | null;
    total_descontos_documento: number | null;
    total_liquido_documento: number | null;
  },
) => {
  if (totals.total_rendimentos_documento == null || totals.total_descontos_documento == null) {
    throw new Error("A IA não identificou os totais oficiais de rendimentos e descontos no PDF. Reprocesse com um documento que contenha o resumo da folha ou revise manualmente.");
  }

  let total_rendimentos_lancamentos = 0;
  let total_descontos_lancamentos = 0;

  for (const l of lancamentos) {
    const valor = parseAiMoney(l?.valor) ?? 0;
    if (valor <= 0) continue;
    const tipo = classifyLancamento(l);
    if (tipo === "rendimento") total_rendimentos_lancamentos = round2(total_rendimentos_lancamentos + valor);
    if (tipo === "desconto") total_descontos_lancamentos = round2(total_descontos_lancamentos + valor);
  }

  const total_liquido_lancamentos = round2(total_rendimentos_lancamentos - total_descontos_lancamentos);
  const checks: { label: string; doc: number; planilha: number }[] = [
    {
      label: "Rendimentos",
      doc: totals.total_rendimentos_documento,
      planilha: total_rendimentos_lancamentos,
    },
    {
      label: "Descontos",
      doc: totals.total_descontos_documento,
      planilha: total_descontos_lancamentos,
    },
  ];
  if (totals.total_liquido_documento != null) {
    checks.push({ label: "Líquido", doc: totals.total_liquido_documento, planilha: total_liquido_lancamentos });
  }

  const divergencias = checks
    .map((c) => ({ ...c, diff: round2(c.planilha - c.doc) }))
    .filter((c) => Math.abs(c.diff) > 0.01);

  if (divergencias.length) {
    const detalhe = divergencias
      .map((d) => `${d.label}: documento ${d.doc.toFixed(2)}, lançamentos ${d.planilha.toFixed(2)}, diferença ${d.diff.toFixed(2)}`)
      .join("; ");
    throw new Error(`Divergência nos totais da folha. ${detalhe}. Nada foi salvo para evitar valor inventado ou incompleto.`);
  }

  return {
    total_rendimentos_lancamentos,
    total_descontos_lancamentos,
    total_liquido_lancamentos,
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");
    const { clientId, competencia, uploadIds } = await req.json();
    if (!clientId || !competencia || !Array.isArray(uploadIds) || uploadIds.length === 0) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Plano de contas
    const { data: planoRow } = await supa
      .from("planos_contas")
      .select("conteudo")
      .eq("user_id", clientId)
      .maybeSingle();

    let planoText = "[PLANO DE CONTAS não cadastrado para esta empresa]";
    if (planoRow?.conteudo) {
      const { text } = planoContasForAI(planoRow.conteudo);
      if (text) planoText = "[PLANO DE CONTAS]\n" + text;
    }

    const { data: uploads, error: upErr } = await supa
      .from("folha_uploads")
      .select("*")
      .in("id", uploadIds);
    if (upErr) throw upErr;

    let totalLancamentos = 0;
    let totalErros = 0;
    const allRows: any[] = [];

    // Limpa lançamentos anteriores desta competência (substituição completa)
    await supa.from("folha_lancamentos").delete().eq("client_id", clientId).eq("competencia", competencia);

    for (const up of uploads || []) {
      try {
        await supa.from("folha_uploads").update({
          status: "processando",
          ultimo_erro: null,
          total_rendimentos_documento: null,
          total_descontos_documento: null,
          total_liquido_documento: null,
          total_rendimentos_lancamentos: null,
          total_descontos_lancamentos: null,
          total_liquido_lancamentos: null,
        }).eq("id", up.id);

        const { data: file, error: dlErr } = await supa.storage.from("lancamentos").download(up.storage_path);
        if (dlErr) throw dlErr;
        const buf = new Uint8Array(await file.arrayBuffer());
        let bin = "";
        for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
        const b64 = btoa(bin);

        const totalsBody = {
          model: "google/gemini-2.5-flash",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: TOTALS_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: `Competência: ${competencia}\n\nExtraia apenas os totais oficiais de rendimentos, descontos e líquido do PDF anexo. Não gere lançamentos.` },
                { type: "file", file: { filename: up.nome_arquivo, file_data: `data:application/pdf;base64,${b64}` } },
              ],
            },
          ],
        };

        const totalsRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": LOVABLE_API_KEY,
          },
          body: JSON.stringify(totalsBody),
        });

        if (totalsRes.status === 429) throw new Error("Limite de requisições atingido. Tente novamente em alguns instantes.");
        if (totalsRes.status === 402) throw new Error("Créditos da IA esgotados. Adicione créditos no workspace.");
        if (!totalsRes.ok) {
          const errText = await totalsRes.text();
          throw new Error(`IA Gateway erro ${totalsRes.status}: ${errText.slice(0, 200)}`);
        }

        const totalsJson = await totalsRes.json();
        const totalsFinishReason = totalsJson?.choices?.[0]?.finish_reason;
        if (totalsFinishReason === "length" || totalsFinishReason === "max_tokens") {
          throw new Error("A resposta da IA com os totais oficiais foi cortada. Reprocesse o documento para evitar conferência incompleta.");
        }
        const officialTotals = extractAiPayload(totalsJson?.choices?.[0]?.message?.content ?? "");
        if (officialTotals.total_rendimentos_documento == null || officialTotals.total_descontos_documento == null) {
          throw new Error(officialTotals.observacoes_ia || "A IA não identificou os totais oficiais de rendimentos e descontos no PDF. Nada foi salvo para evitar valores incompletos.");
        }

        const body = {
          model: "google/gemini-2.5-flash",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: `Competência: ${competencia}\n\n${planoText}\n\nTotais oficiais já extraídos do documento para conferência obrigatória:\n- Rendimentos: ${officialTotals.total_rendimentos_documento.toFixed(2)}\n- Descontos: ${officialTotals.total_descontos_documento.toFixed(2)}\n- Líquido: ${officialTotals.total_liquido_documento != null ? officialTotals.total_liquido_documento.toFixed(2) : "não informado"}\n\nAnalise o PDF da folha de pagamento anexo. Retorne ESTRITAMENTE um objeto JSON conforme especificado no system prompt, com as chaves "observacoes_ia", "total_rendimentos_documento", "total_descontos_documento", "total_liquido_documento" e "lancamentos". Se não houver dados extraíveis, retorne os totais como null e "lancamentos": []. Não inclua texto fora do JSON. LEMBRE: os valores dos lançamentos e dos totais devem ser IDÊNTICOS aos do PDF, sem arredondar, estimar ou completar diferenças.` },
                { type: "file", file: { filename: up.nome_arquivo, file_data: `data:application/pdf;base64,${b64}` } },
              ],
            },
          ],
        };

        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": LOVABLE_API_KEY,
          },
          body: JSON.stringify(body),
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
          throw new Error("A resposta da IA foi cortada antes do fim. Reprocesse o documento para evitar lançamentos incompletos.");
        }
        const content = aiJson?.choices?.[0]?.message?.content ?? "";
        const {
          lancamentos: lancs,
          observacoes_ia,
        } = extractAiPayload(content);
        const total_rendimentos_documento = officialTotals.total_rendimentos_documento;
        const total_descontos_documento = officialTotals.total_descontos_documento;
        const total_liquido_documento = officialTotals.total_liquido_documento;

        const fallbackDate = lastDayOfCompetencia(competencia);
        const isValidISO = (d: string | null) => {
          if (!d) return false;
          const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (!m) return false;
          const y = Number(m[1]), mo = Number(m[2]), da = Number(m[3]);
          const dt = new Date(Date.UTC(y, mo - 1, da));
          return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === da;
        };

        // Fidelidade total: usamos os lançamentos exatamente como a IA retornou.
        // Nenhuma reconciliação matemática, nenhuma linha sintética.
        const lancsArr = Array.isArray(lancs) ? [...lancs] : [];
        const totaisLancamentos = validateFolhaTotals(lancsArr, {
          total_rendimentos_documento,
          total_descontos_documento,
          total_liquido_documento,
        });

        const rowsToInsert = lancsArr.map((l: any, idx: number) => {
          const parsed = parseDateBR(l.data);
          const data = isValidISO(parsed) ? parsed : fallbackDate;
          const rawHist = String(l.historico || "").trim();
          // Preserva prefixos [SUGERIDO] / [REVISAR] sem forçar toUpperCase quebrando os colchetes
          const historico = rawHist ? rawHist.replace(/\s+/g, " ").toUpperCase() : "";
          const justificativa = l.justificativa != null && String(l.justificativa).trim() !== ""
            ? String(l.justificativa).trim()
            : null;
          return {
            client_id: clientId,
            competencia,
            data,
            conta_debito: l.conta_debito != null && String(l.conta_debito).trim() !== "" ? String(l.conta_debito).trim() : null,
            conta_credito: l.conta_credito != null && String(l.conta_credito).trim() !== "" ? String(l.conta_credito).trim() : null,
            historico,
            justificativa,
            valor: parseAiMoney(l.valor) ?? 0,
            ordem: allRows.length + idx,
            source_upload_id: up.id,
          };
        }).filter((r) => r.valor > 0);
        allRows.push(...rowsToInsert);
        totalLancamentos += rowsToInsert.length;

        await supa.from("folha_uploads").update({
          status: "processado",
          ultimo_erro: null,
          observacoes_ia: [officialTotals.observacoes_ia, observacoes_ia].filter(Boolean).join("\n\n") || null,
          total_rendimentos_documento,
          total_descontos_documento,
          total_liquido_documento,
          ...totaisLancamentos,
        }).eq("id", up.id);
      } catch (e: any) {
        totalErros += 1;
        console.error("Erro processando upload", up.id, e);
        await supa.from("folha_uploads").update({ status: "erro", ultimo_erro: String(e.message || e).slice(0, 500) }).eq("id", up.id);
      }
    }

    if (allRows.length) {
      const { error: insErr } = await supa.from("folha_lancamentos").insert(allRows);
      if (insErr) throw insErr;
    }

    return new Response(JSON.stringify({ success: true, total_lancamentos: totalLancamentos, total_erros: totalErros }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("process-folha-pagamento error", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
