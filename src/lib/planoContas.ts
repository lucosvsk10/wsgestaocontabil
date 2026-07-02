import { supabase } from "@/integrations/supabase/client";

/**
 * Plano de contas: apenas C.R. (código reduzido).
 * O conceito de "código completo" e "preferência da IA" foi removido.
 * O parser mantém compatibilidade com dados antigos que ainda possam existir no banco.
 */

export interface PlanoContasItem {
  /** Código reduzido (C.R.) — único código usado no sistema. */
  cr: string;
  /** Descrição da conta */
  descricao: string;
}

export type PlanoContasMap = Record<string, string>;

const normalizeCodigo = (codigo: string): string =>
  codigo.trim().replace(/\s+/g, "");

const codigoAliases = (codigo: string): string[] => {
  const clean = normalizeCodigo(String(codigo ?? ""));
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

export const addPlanoContasAliases = (map: PlanoContasMap, codigo: string, descricao: string) => {
  const desc = String(descricao ?? "").trim();
  if (!desc) return;
  for (const alias of codigoAliases(codigo)) {
    if (!map[alias]) map[alias] = desc;
  }
};

export const lookupPlanoContasDescricao = (map: PlanoContasMap, codigo: string | null | undefined): string => {
  if (!codigo) return "";
  const aliases = codigoAliases(String(codigo));
  for (const alias of aliases) {
    if (map[alias]) return map[alias];
  }
  return "";
};

export interface PlanoContasParsed {
  items: PlanoContasItem[];
}

export const parsePlanoContasContent = (conteudo: string): PlanoContasParsed => {
  const empty: PlanoContasParsed = { items: [] };
  if (!conteudo) return empty;
  try {
    const parsed = JSON.parse(conteudo);

    // Formato atual: { items: [{cr, descricao}] } (ignora preferencia_ia/codigo_completo legados)
    if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.items)) {
      const items: PlanoContasItem[] = parsed.items
        .map((i: any) => {
          const cr = String(
            i.cr ?? i.codigo_reduzido ?? i.codigo ?? i.codigo_completo ?? "",
          ).trim();
          const descricao = String(i.descricao ?? "").trim();
          return { cr, descricao };
        })
        .filter((i: PlanoContasItem) => i.cr);
      return { items };
    }

    // Formato antigo: [{ codigo, descricao }]
    if (Array.isArray(parsed) && parsed.length > 0 && "codigo" in parsed[0]) {
      const items: PlanoContasItem[] = parsed
        .map((i: any) => ({
          cr: String(i.codigo ?? "").trim(),
          descricao: String(i.descricao ?? "").trim(),
        }))
        .filter((i) => i.cr);
      return { items };
    }

    // Formatos legados (planilha bruta)
    const arr = Array.isArray(parsed) && parsed[0]?.data ? parsed[0].data : Array.isArray(parsed) ? parsed : [];
    const items: PlanoContasItem[] = [];
    for (const item of arr) {
      const cr = String(
        item["Codigo reduzido"] || item["codigo_reduzido"] || item["CR"] || item["C.R."] || "",
      ).trim();
      const descricao = String(item["Descrição"] || item["descricao"] || item["Descrição da conta"] || "").trim();
      if (cr) items.push({ cr, descricao });
    }
    return { items };
  } catch {
    return empty;
  }
};

/** Serializa para gravação no banco (apenas CR + descrição). */
export const serializePlanoContas = (items: PlanoContasItem[]): string => {
  const cleanItems = items
    .map((i) => ({
      cr: (i.cr || "").trim(),
      descricao: (i.descricao || "").trim(),
    }))
    .filter((i) => i.cr);
  return JSON.stringify({ items: cleanItems });
};

/** Constrói o map do CR (com aliases de formatação) → descrição. */
export const buildPlanoContasMap = (items: PlanoContasItem[]): PlanoContasMap => {
  const map: PlanoContasMap = {};
  for (const it of items) {
    addPlanoContasAliases(map, it.cr, it.descricao);
  }
  return map;
};

export const fetchPlanoContas = async (
  clientId: string,
): Promise<{
  items: PlanoContasItem[];
  map: PlanoContasMap;
}> => {
  const { data } = await supabase
    .from("planos_contas")
    .select("conteudo")
    .eq("user_id", clientId)
    .maybeSingle();

  const { items } = data?.conteudo ? parsePlanoContasContent(data.conteudo) : { items: [] };
  const map = buildPlanoContasMap(items);
  return { items, map };
};
