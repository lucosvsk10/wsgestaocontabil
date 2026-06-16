import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM_PROMPT = `Você é o motor de inteligência contábil de um sistema de gestão de documentos. Sua função é analisar relatórios de Folha de Pagamento (PDF) e transformá-los em lotes de lançamentos otimizados para o Calima ERP.

Para mapear as contas corretamente, você deve cruzar os eventos da folha com o [PLANO DE CONTAS] fornecido no contexto da requisição.

### PRINCÍPIO DA CONCILIAÇÃO DINÂMICA
Não decore códigos fixos. Para cada evento encontrado na folha, busque no Plano de Contas a conta analítica correspondente à sua natureza:
1. Eventos de Gasto/Custo da Empresa -> Débito em conta de Despesa/Resultado.
2. Eventos de Obrigações/Retenções -> Crédito em conta de Passivo Circulante.

### REGRA CRÍTICA DE CONTA DE DÉBITO (FUNCIONÁRIOS)
Para QUALQUER verba rescisória ou salarial de FUNCIONÁRIOS (salários, médias, gratificações, salário família, ajuda de custo, aviso prévio, saldo de salário, 13º, férias indenizadas, etc.), a conta de DÉBITO de despesa deve ser OBRIGATORIAMENTE a conta 92 (Despesa de Salários/Folha de funcionários). NUNCA utilize contas de honorários ou diretoria (como a 88) para funcionários, a menos que o Plano de Contas indique explicitamente outra conta para aquela categoria específica. A conta 88 (ou equivalente de pró-labore/diretoria) deve ser usada APENAS para Pró-labore de sócios.

### REGRAS DE OTIMIZAÇÃO (Redução de Linhas)
Agrupe valores com a mesma combinação de [Conta Débito + Conta Crédito], consolidando o histórico:

1. REMUNERAÇÕES REGULARES (Salários, Médias, Gratificações, Salário Família, Ajuda de Custo):
   - Mapeamento: Débito na conta 92 (Despesa de Salários de funcionários) e Crédito em Salários a Pagar.
   - Histórico Padronizado: "SALARIOS E REMUNERAÇÕES A PAGAR"

2. PRÓ-LABORE DOS SÓCIOS:
   - Mapeamento: Débito na Despesa de Pró-labore e Crédito em Pró-labore a Pagar.
   - Histórico Padronizado: "PRO-LABORE A PAGAR MÊS [MM/AAAA]"

3. VERBAS RESCISÓRIAS GERAIS DE FUNCIONÁRIOS (Saldo de Salário, Aviso Prévio, 13º Rescisão):
   - Mapeamento: Débito na conta 92 (Despesa de Salários de funcionários) e Crédito em Salários a Pagar ou Benefícios Rescisórios.
   - Histórico Padronizado: "RECISAO A PAGAR MÊS [MM/AAAA]"

4. FÉRIAS NA RESCISÃO / INDENIZADAS DE FUNCIONÁRIOS:
   - Mapeamento: Débito na conta 92 (Despesa de Salários de funcionários) e Crédito em Férias a Pagar / Benefícios Rescisórios.
   - Histórico Padronizado: "FERIAS A PAGAR MÊS DE [MM/AAAA] (RECISÃO)"

5. RETENÇÕES DE INSS:
   - INSS sobre Salários de Empregados -> "INSS S/SALÁRIOS A PAGAR MÊS [MM/AAAA]"
   - INSS sobre Pró-labore de Sócios -> "INSS S/PRO-LABORE (SOCIO) A PAGAR MÊS [MM/AAAA]"
   - INSS sobre 13º Salário de Rescisão -> "INSS S/13º SALARIO - RECISÃO A PAGAR MÊS DE [MM/AAAA]"
   - Mapeamento: Débito na respectiva conta do Passivo que sofreu o desconto e Crédito na obrigação de INSS a Recolher.

6. ENCARGOS DA EMPRESA (FGTS):
   - Mapeamento: Débito na Despesa de FGTS e Crédito na obrigação de FGTS a Recolher.
   - Histórico Padronizado: "FGTS A PAGAR MÊS [MM/AAAA]"

### DIRETRIZES DE FORMATAÇÃO
- Data: sempre o último dia do mês da competência da folha analisada (DD/MM/AAAA).
- Históricos: SEMPRE em CAIXA ALTA, substituindo "[MM/AAAA]" pela competência real.
- Valores: numéricos limpos (float). Se o resultado acumulado de um grupo for zero, não gere a linha.

### FORMATO DO RETORNO (JSON STRICT)
Retorne ESTRITAMENTE um array JSON, sem markdown, sem texto introdutório:
[
  { "data": "DD/MM/AAAA", "conta_debito": "STRING", "conta_credito": "STRING", "historico": "STRING", "valor": NUMBER }
]`;

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

const extractJsonArray = (text: string): any[] => {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("Resposta da IA não contém um array JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
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
      try {
        const parsed = JSON.parse(planoRow.conteudo);
        const items = Array.isArray(parsed) && parsed.length && "codigo" in parsed[0]
          ? parsed
          : (Array.isArray(parsed) && parsed[0]?.data ? parsed[0].data : (Array.isArray(parsed) ? parsed : []));
        const lines = items.map((i: any) => {
          const code = i.codigo || i["Codigo reduzido"] || i["codigo_reduzido"] || "";
          const desc = i.descricao || i["Descrição"] || i["descricao"] || "";
          return `${code} - ${desc}`;
        }).filter(Boolean);
        planoText = "[PLANO DE CONTAS]\n" + lines.join("\n");
      } catch { /* keep default */ }
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
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: `Competência: ${competencia}\n\n${planoText}\n\nAnalise o PDF da folha de pagamento anexo e retorne o array JSON conforme especificado.` },
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
        const lancs = extractJsonArray(content);

        const fallbackDate = lastDayOfCompetencia(competencia);
        const isValidISO = (d: string | null) => {
          if (!d) return false;
          const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (!m) return false;
          const y = Number(m[1]), mo = Number(m[2]), da = Number(m[3]);
          const dt = new Date(Date.UTC(y, mo - 1, da));
          return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === da;
        };

        const rowsToInsert = lancs.map((l: any, idx: number) => {
          const parsed = parseDateBR(l.data);
          const data = isValidISO(parsed) ? parsed : fallbackDate;
          return {
            client_id: clientId,
            competencia,
            data,
            conta_debito: l.conta_debito != null ? String(l.conta_debito) : null,
            conta_credito: l.conta_credito != null ? String(l.conta_credito) : null,
            historico: String(l.historico || "").toUpperCase(),
            valor: Number(l.valor) || 0,
            ordem: allRows.length + idx,
            source_upload_id: up.id,
          };
        });
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
