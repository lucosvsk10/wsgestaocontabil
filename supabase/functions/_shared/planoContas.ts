// Shared helpers para parsear o plano de contas nas edge functions.
// Simplificado: apenas C.R. (código reduzido). Mantém compatibilidade de leitura
// com formatos legados (que continham codigo_completo/preferencia_ia).

export interface PlanoContasItem {
  cr: string;
  descricao: string;
}

export interface PlanoContasParsed {
  items: PlanoContasItem[];
}

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
        .map((i: any) => ({
          cr: String(i.cr ?? i.codigo_reduzido ?? i.codigo ?? i.codigo_completo ?? "").trim(),
          descricao: String(i.descricao ?? "").trim(),
        }))
        .filter((i: PlanoContasItem) => i.cr);
      return { items };
    }

    if (Array.isArray(parsed) && parsed.length > 0 && "codigo" in parsed[0]) {
      const items: PlanoContasItem[] = parsed
        .map((i: any) => ({
          cr: String(i.codigo ?? "").trim(),
          descricao: String(i.descricao ?? "").trim(),
        }))
        .filter((i) => i.cr);
      return { items };
    }

    const arr = Array.isArray(parsed) && parsed[0]?.data ? parsed[0].data : Array.isArray(parsed) ? parsed : [];
    const items: PlanoContasItem[] = [];
    for (const item of arr) {
      const cr = String(item["Codigo reduzido"] || item["codigo_reduzido"] || item["CR"] || item["C.R."] || "").trim();
      const descricao = String(item["Descrição"] || item["descricao"] || item["Descrição da conta"] || "").trim();
      if (cr) items.push({ cr, descricao });
    }
    return { items };
  } catch {
    return empty;
  }
};

/** Map do CR (com aliases de formatação) → descrição. */
export const buildPlanoMap = (items: PlanoContasItem[]): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const it of items) {
    for (const alias of codigoAliases(it.cr)) {
      if (alias && !map[alias]) map[alias] = it.descricao;
    }
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
 * Versão compacta para mandar à IA: apenas CR + descrição.
 * A IA deve usar exclusivamente o CR — não existe mais código completo.
 */
export const planoContasForAI = (conteudo: string | null | undefined): {
  text: string;
  json: { codigo: string; descricao: string }[];
} => {
  const { items } = parsePlanoContas(conteudo);
  const rows = items
    .map((it) => ({ codigo: it.cr, descricao: it.descricao }))
    .filter((r) => r.codigo);
  const text = rows.map((r) => `${r.codigo} - ${r.descricao}`).join("\n");
  return { text, json: rows };
};
