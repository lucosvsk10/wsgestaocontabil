import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { planoContasForAI } from "../_shared/planoContas.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM_PROMPT = `Você é o motor de inteligência contábil de um sistema de gestão de documentos. Sua função é analisar relatórios de Folha de Pagamento (PDF) e transformá-los em lotes de lançamentos otimizados para o Calima ERP.

Você DEVE cruzar cada evento da folha com o [PLANO DE CONTAS] enviado no contexto desta requisição. Os códigos (CR) variam de empresa para empresa — NÃO existe código fixo. Use SEMPRE, e somente, códigos que apareçam no [PLANO DE CONTAS]. NUNCA invente um CR que não esteja lá.

### PRINCÍPIO DA CONCILIAÇÃO DINÂMICA (por NATUREZA da conta)
Para cada evento, identifique a NATUREZA contábil e depois escolha, no plano de contas da empresa, a conta cuja descrição corresponda a essa natureza. Categorias:

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

Agrupe linhas com a MESMA combinação [Conta Débito + Conta Crédito] somando os valores.

### VERBAS NOVAS / NÃO PREVISTAS (IMPORTANTE)
A folha pode trazer eventos não listados acima (auxílios, benefícios, prêmios, descontos específicos, adicionais, etc.). Nesses casos:
1. Identifique a natureza contábil (é despesa? passivo a pagar? obrigação a recolher?).
2. Procure no plano de contas a conta cuja DESCRIÇÃO seja SEMANTICAMENTE MAIS PRÓXIMA. Use tokens como "auxilio", "beneficio", "premio", "adicional", "vale", "diaria", etc.
3. Se encontrar uma conta plausível, use-a normalmente MAS prefixe o histórico com "[SUGERIDO] " para o usuário revisar.
4. Se NENHUMA conta do plano se aplicar, gere a linha com "conta_debito": null e "conta_credito": null (o que couber ficar em branco) e prefixe o histórico com "[REVISAR] " descrevendo a verba.

Isso vale para AMBOS os lados (débito e crédito). NUNCA descarte um valor da folha silenciosamente.

### VERIFICAÇÃO OBRIGATÓRIA (DOUBLE-CHECK)
Some TODOS os valores das linhas de REMUNERAÇÕES (itens 1, 3 e 4), EXCLUINDO pró-labore. O total deve bater EXATAMENTE com o campo "Rendimentos"/"Total de Proventos" do PDF SUBTRAÍDO do valor do Pró-labore. Se não bater, revise antes de emitir o JSON.

### FORMATAÇÃO
- Data: último dia real do mês da competência (DD/MM/AAAA).
- Históricos: em CAIXA ALTA (menos os prefixos "[SUGERIDO] " e "[REVISAR] " que ficam entre colchetes). Substitua "[MM/AAAA]" pela competência real.
- Valores: numéricos limpos (float). Não gere linha com valor zero.

### FORMATO DO RETORNO (JSON STRICT)
Retorne ESTRITAMENTE um objeto JSON:
{
  "campos_pdf": {
    "salario_base": NUMBER,
    "salario_familia": NUMBER,
    "ferias": NUMBER,
    "um_terco_ferias": NUMBER,
    "ajuda_custo": NUMBER,
    "e_consignado": NUMBER,
    "rendimentos_total": NUMBER,
    "pro_labore": NUMBER
  },
  "lancamentos": [
    { "data": "DD/MM/AAAA", "conta_debito": "STRING_OR_NULL", "conta_credito": "STRING_OR_NULL", "historico": "STRING", "valor": NUMBER }
  ]
}
Use 0 para qualquer campo numérico ausente em "campos_pdf". NUNCA omita uma chave de "campos_pdf". "campos_pdf" reflete os valores brutos do PDF, sem agrupamentos.`;


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

const extractAiPayload = (text: string): { campos: Record<string, number>; lancamentos: any[] } => {
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

  const rawCampos = (parsed && typeof parsed === "object" && parsed.campos_pdf && typeof parsed.campos_pdf === "object")
    ? parsed.campos_pdf : {};
  const num = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const campos: Record<string, number> = {
    salario_base: num(rawCampos.salario_base),
    salario_familia: num(rawCampos.salario_familia),
    ferias: num(rawCampos.ferias),
    um_terco_ferias: num(rawCampos.um_terco_ferias ?? rawCampos["1_3_ferias"] ?? rawCampos.terco_ferias),
    ajuda_custo: num(rawCampos.ajuda_custo),
    e_consignado: num(rawCampos.e_consignado ?? rawCampos.eConsignado ?? rawCampos.emprestimo_consignado),
    rendimentos_total: num(rawCampos.rendimentos_total),
    pro_labore: num(rawCampos.pro_labore),
  };
  return { campos, lancamentos };
};

const round2 = (n: number) => Math.round(n * 100) / 100;

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
    const allRows: any[] = [];

    // Limpa lançamentos anteriores desta competência (substituição completa)
    await supa.from("folha_lancamentos").delete().eq("client_id", clientId).eq("competencia", competencia);

    for (const up of uploads || []) {
      try {
        await supa.from("folha_uploads").update({ status: "processando", ultimo_erro: null }).eq("id", up.id);

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
                { type: "text", text: `Competência: ${competencia}\n\n${planoText}\n\nAnalise o PDF da folha de pagamento anexo. Retorne ESTRITAMENTE um objeto JSON conforme especificado no system prompt, com as chaves "campos_pdf" (valores brutos extraídos do PDF) e "lancamentos" (array de lançamentos contábeis). Se não houver dados extraíveis, retorne { "campos_pdf": { ...todos zerados }, "lancamentos": [] }. Não inclua texto fora do JSON.` },
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
        const content = aiJson?.choices?.[0]?.message?.content ?? "";
        const { campos, lancamentos: lancs } = extractAiPayload(content);

        const fallbackDate = lastDayOfCompetencia(competencia);
        const isValidISO = (d: string | null) => {
          if (!d) return false;
          const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (!m) return false;
          const y = Number(m[1]), mo = Number(m[2]), da = Number(m[3]);
          const dt = new Date(Date.UTC(y, mo - 1, da));
          return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === da;
        };

        // ====== RECONCILIAÇÃO MATEMÁTICA (via código, não confiar na IA) ======
        // 1) Valor exato da linha SALÁRIOS (Débito 92 / Crédito 823):
        //    Salário Base + Salário Família + Férias + 1/3 Férias + Ajuda de Custo
        const salarioCalculado = round2(
          campos.salario_base +
          campos.salario_familia +
          campos.ferias +
          campos.um_terco_ferias +
          campos.ajuda_custo
        );

        const isSalarioRow = (l: any) =>
          String(l?.conta_debito ?? "").trim() === "92" &&
          String(l?.conta_credito ?? "").trim() === "823";

        const isConsignadoRow = (l: any) => {
          const deb = String(l?.conta_debito ?? "").trim();
          const hist = String(l?.historico ?? "").toUpperCase();
          return deb === "823" && /CONSIGN/.test(hist);
        };

        const lancsArr = Array.isArray(lancs) ? [...lancs] : [];

        // Substitui (ou cria) a linha de salários com o valor calculado
        const salarioIdx = lancsArr.findIndex(isSalarioRow);
        if (salarioCalculado > 0) {
          if (salarioIdx >= 0) {
            lancsArr[salarioIdx] = {
              ...lancsArr[salarioIdx],
              valor: salarioCalculado,
              historico: "SALARIOS E REMUNERAÇÕES A PAGAR",
            };
          } else {
            lancsArr.unshift({
              data: null,
              conta_debito: "92",
              conta_credito: "823",
              historico: "SALARIOS E REMUNERAÇÕES A PAGAR",
              valor: salarioCalculado,
            });
          }
        } else if (salarioIdx >= 0) {
          // Sem valor calculado mas IA criou linha: remove se zerada
          if (!(Number(lancsArr[salarioIdx]?.valor) > 0)) lancsArr.splice(salarioIdx, 1);
        }

        // Garante linha de eConsignado (Débito 823 / Crédito 912) se houver valor
        const eCons = round2(campos.e_consignado);
        const consIdx = lancsArr.findIndex(isConsignadoRow);
        const mmAaaa = competencia.match(/^(\d{4})-(\d{2})/);
        const histConsig = `EMPRESTIMO CONSIGNADO EM FOLHA MÊS ${mmAaaa ? `${mmAaaa[2]}/${mmAaaa[1]}` : ""}`.trim();
        if (eCons > 0) {
          if (consIdx >= 0) {
            lancsArr[consIdx] = {
              ...lancsArr[consIdx],
              conta_debito: "823",
              conta_credito: String(lancsArr[consIdx]?.conta_credito ?? "912") || "912",
              valor: eCons,
              historico: histConsig,
            };
          } else {
            lancsArr.push({
              data: null,
              conta_debito: "823",
              conta_credito: "912",
              historico: histConsig,
              valor: eCons,
            });
          }
        }

        const rowsToInsert = lancsArr.map((l: any, idx: number) => {
          const parsed = parseDateBR(l.data);
          const data = isValidISO(parsed) ? parsed : fallbackDate;
          return {
            client_id: clientId,
            competencia,
            data,
            conta_debito: l.conta_debito != null ? String(l.conta_debito) : null,
            conta_credito: l.conta_credito != null ? String(l.conta_credito) : null,
            historico: String(l.historico || "").toUpperCase(),
            valor: round2(Number(l.valor) || 0),
            ordem: allRows.length + idx,
            source_upload_id: up.id,
          };
        }).filter((r) => r.valor > 0);
        allRows.push(...rowsToInsert);
        totalLancamentos += rowsToInsert.length;

        await supa.from("folha_uploads").update({ status: "processado", ultimo_erro: null }).eq("id", up.id);
      } catch (e: any) {
        console.error("Erro processando upload", up.id, e);
        await supa.from("folha_uploads").update({ status: "erro", ultimo_erro: String(e.message || e).slice(0, 500) }).eq("id", up.id);
      }
    }

    if (allRows.length) {
      const { error: insErr } = await supa.from("folha_lancamentos").insert(allRows);
      if (insErr) throw insErr;
    }

    return new Response(JSON.stringify({ success: true, total_lancamentos: totalLancamentos }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("process-folha-pagamento error", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
