// Shared helpers para parsear o plano de contas dentro das edge functions.
// Mantém compatibilidade com o formato antigo ([{codigo, descricao}]) e com
// planilhas legadas. O formato atual é { preferencia_ia, items }.

export type PlanoContasPreferencia = "cr" | "completo";

export interface PlanoContasItem {
  cr: string;
  codigo_completo: string;
  descricao: string;
}

export interface PlanoContasParsed {
  items: PlanoContasItem[];
  preferencia: PlanoContasPreferencia;
}

const pickCode = (it: PlanoContasItem, pref: PlanoContasPreferencia): string => {
  const primary = pref === "completo" ? it.codigo_completo : it.cr;
  if (primary) return primary;
  return pref === "completo" ? it.cr : it.codigo_completo;
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
  const empty: PlanoContasParsed = { items: [], preferencia: "cr" };
  if (!conteudo) return empty;
  try {
    const parsed = JSON.parse(conteudo);

    if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.items)) {
      const preferencia: PlanoContasPreferencia =
        parsed.preferencia_ia === "completo" ? "completo" : "cr";
      const items: PlanoContasItem[] = parsed.items
        .map((i: any) => ({
          cr: String(i.cr ?? i.codigo_reduzido ?? i.codigo ?? "").trim(),
          codigo_completo: String(i.codigo_completo ?? i.codigoCompleto ?? "").trim(),
          descricao: String(i.descricao ?? "").trim(),
        }))
        .filter((i: PlanoContasItem) => i.cr || i.codigo_completo);
      return { items, preferencia };
    }

    if (Array.isArray(parsed) && parsed.length > 0 && "codigo" in parsed[0]) {
      const items: PlanoContasItem[] = parsed
        .map((i: any) => ({
          cr: String(i.codigo ?? "").trim(),
          codigo_completo: "",
          descricao: String(i.descricao ?? "").trim(),
        }))
        .filter((i) => i.cr);
      return { items, preferencia: "cr" };
    }

    const arr = Array.isArray(parsed) && parsed[0]?.data ? parsed[0].data : Array.isArray(parsed) ? parsed : [];
    const items: PlanoContasItem[] = [];
    for (const item of arr) {
      const cr = String(item["Codigo reduzido"] || item["codigo_reduzido"] || item["CR"] || item["C.R."] || "").trim();
      const descricao = String(item["Descrição"] || item["descricao"] || item["Descrição da conta"] || "").trim();
      if (cr) items.push({ cr, codigo_completo: "", descricao });
    }
    return { items, preferencia: "cr" };
  } catch {
    return empty;
  }
};

/** Map com C.R., código completo e variações de formatação para exports/relatórios. */
export const buildPlanoMap = (
  items: PlanoContasItem[],
  _preferencia?: PlanoContasPreferencia,
): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const it of items) {
    for (const code of [...codigoAliases(it.cr), ...codigoAliases(it.codigo_completo)]) {
      if (code && !map[code]) map[code] = it.descricao;
    }
  }
  return map;
};

/**
 * Versão compacta para mandar à IA: somente o código preferido + descrição.
 * Reduz token vs. enviar conteudo bruto com ambos os códigos.
 */
export const planoContasForAI = (conteudo: string | null | undefined): {
  text: string;
  json: { codigo: string; descricao: string }[];
  preferencia: PlanoContasPreferencia;
} => {
  const { items, preferencia } = parsePlanoContas(conteudo);
  const rows = items
    .map((it) => ({ codigo: pickCode(it, preferencia), descricao: it.descricao }))
    .filter((r) => r.codigo);
  const text = rows.map((r) => `${r.codigo} - ${r.descricao}`).join("\n");
  return { text, json: rows, preferencia };
};
