// Shared helpers para parsear o plano de contas nas edge functions.
// Estrutura: cr (código reduzido, usado nos lançamentos), conta (código completo,
// usado apenas para identificar grupo/subgrupo), descricao e analitica (Sim/Não).

export interface PlanoContasItem {
  cr: string;
  conta: string;
  descricao: string;
  analitica: boolean;
}

export interface PlanoContasParsed {
  items: PlanoContasItem[];
}

export const parseAnalitica = (value: unknown): boolean => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return true;
  if (["nao", "não", "n", "false", "0", "sintetica", "sintética", "sint"].includes(raw)) return false;
  return true;
};

const codigoAliases = (codigo: string): string[] => {
  const clean = String(codigo ?? "").trim().replace(/\s+/g, "");
  if (!clean) return [];
  const aliases = new Set<string>([clean]);
  const withoutSeparators = clean.replace(/[^\p{L}\p{N}]/gu, "");
  if (withoutSeparators) aliases.add(withoutSeparators);
  const withoutLeadingZerosBySegment = clean
    .split(/([.\-/])/)
    .map((part) => (/^\d+$/.test(part) ? String(Number(part)) : part))
    .join("");
  if (withoutLeadingZerosBySegment) aliases.add(withoutLeadingZerosBySegment);
  const onlyDigitsNoLeadingZeros = withoutSeparators.replace(/^0+(?=\d)/, "");
  if (onlyDigitsNoLeadingZeros) aliases.add(onlyDigitsNoLeadingZeros);
  return Array.from(aliases);
};

export const parsePlanoContas = (conteudo: string | null | undefined): PlanoContasParsed => {
  const empty: PlanoContasParsed = { items: [] };
  if (!conteudo) return empty;
  try {
    const parsed = JSON.parse(conteudo);

    if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.items)) {
      const items: PlanoContasItem[] = parsed.items
        .map((i: any) => {
          const cr = String(i.cr ?? i.codigo_reduzido ?? i.codigo ?? "").trim();
          const conta = String(i.conta ?? i.codigo_completo ?? "").trim();
          return {
            cr: cr || conta,
            conta,
            descricao: String(i.descricao ?? "").trim(),
            analitica: i.analitica === undefined ? true : parseAnalitica(i.analitica),
          };
        })
        .filter((i: PlanoContasItem) => i.cr);
      return { items };
    }

    if (Array.isArray(parsed) && parsed.length > 0 && "codigo" in parsed[0]) {
      const items: PlanoContasItem[] = parsed
        .map((i: any) => ({
          cr: String(i.codigo ?? "").trim(),
          conta: "",
          descricao: String(i.descricao ?? "").trim(),
          analitica: true,
        }))
        .filter((i) => i.cr);
      return { items };
    }

    const arr = Array.isArray(parsed) && parsed[0]?.data ? parsed[0].data : Array.isArray(parsed) ? parsed : [];
    const items: PlanoContasItem[] = [];
    for (const item of arr) {
      const cr = String(item["Codigo reduzido"] || item["codigo_reduzido"] || item["CR"] || item["C.R."] || "").trim();
      const conta = String(item["Conta"] || item["conta"] || "").trim();
      const descricao = String(item["Descrição"] || item["descricao"] || item["Descrição da conta"] || "").trim();
      if (cr) items.push({ cr, conta, descricao, analitica: parseAnalitica(item["Analitica"] ?? item["Analítica"]) });
    }
    return { items };
  } catch {
    return empty;
  }
};

/** Map dos códigos (CR e conta completa, com aliases de formatação) → descrição. */
export const buildPlanoMap = (items: PlanoContasItem[]): Record<string, string> => {
  const map: Record<string, string> = {};
  const add = (codigo: string, descricao: string) => {
    if (!codigo || !descricao) return;
    for (const alias of codigoAliases(codigo)) {
      if (alias && !map[alias]) map[alias] = descricao;
    }
  };
  for (const it of items) {
    add(it.cr, it.descricao);
    add(it.conta, it.descricao);
  }
  return map;
};

export const lookupPlanoDescricao = (map: Record<string, string>, codigo: string | null | undefined): string => {
  if (!codigo) return "";
  const aliases = codigoAliases(String(codigo));
  for (const alias of aliases) {
    if (map[alias]) return map[alias];
  }
  return "";
};

/**
 * Regras fixas de leitura do plano de contas — injetar no prompt de QUALQUER
 * função de IA que gere lançamentos (folha, despesas, compras, faturamento, etc.).
 */
export const PLANO_CONTAS_RULES = `[REGRAS DO PLANO DE CONTAS — OBRIGATÓRIAS]
O plano de contas vem no formato: CONTA | CR | DESCRIÇÃO | ANALÍTICA
- CR (código reduzido) é o ÚNICO código que pode ser usado em conta_debito e conta_credito. NUNCA use o código completo (CONTA) como conta do lançamento.
- CONTA (código completo) serve APENAS para você entender a qual grupo/subgrupo a conta pertence, pelo primeiro dígito:
  1 = ativo
  2 = passivo
  3 = receita
  4 = despesa
  6 = resultados
- Use o grupo para manter a coerência contábil (ex.: despesa (4) normalmente a débito, receita (3) a crédito, obrigações (2) a crédito).
- Só é permitido lançar em contas ANALÍTICA = Sim. Contas com ANALÍTICA = Não são sintéticas (agrupadoras) e servem apenas como contexto de agrupamento — nunca as use em um lançamento.
- Nenhum código é fixo: escolha sempre pela semântica dentro do plano de contas DESTA empresa.`;

/**
 * Versão compacta para mandar à IA: CONTA | CR | DESCRIÇÃO | ANALÍTICA.
 */
export const planoContasForAI = (conteudo: string | null | undefined): {
  text: string;
  json: { conta: string; codigo: string; descricao: string; analitica: boolean }[];
  rules: string;
} => {
  const { items } = parsePlanoContas(conteudo);
  const rows = items
    .map((it) => ({
      conta: it.conta || "",
      codigo: it.cr,
      descricao: it.descricao,
      analitica: it.analitica !== false,
    }))
    .filter((r) => r.codigo);
  const header = "CONTA | CR | DESCRIÇÃO | ANALÍTICA";
  const text = [header, ...rows.map((r) => `${r.conta || "-"} | ${r.codigo} | ${r.descricao} | ${r.analitica ? "Sim" : "Não"}`)].join("\n");
  return { text, json: rows, rules: PLANO_CONTAS_RULES };
};
