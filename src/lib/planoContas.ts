import { supabase } from "@/integrations/supabase/client";

/**
 * Plano de contas:
 * - `cr`: código reduzido — ÚNICO código usado em débito/crédito nos lançamentos.
 * - `conta`: código completo (estruturado) — usado apenas para identificar grupo/subgrupo.
 * - `analitica`: se a conta aceita lançamento (Sim) ou é sintética/agrupadora (Não).
 */

export interface PlanoContasItem {
  /** Código reduzido (C.R.) — código usado nos lançamentos. */
  cr: string;
  /** Código completo (ex.: 4.1.01.0003) — define grupo/subgrupo. */
  conta?: string;
  /** Descrição da conta */
  descricao: string;
  /** Conta analítica (aceita lançamento). Padrão: true. */
  analitica: boolean;
}

export type PlanoContasMap = Record<string, string>;

const normalizeCodigo = (codigo: string): string =>
  codigo.trim().replace(/\s+/g, "");

export const parseAnalitica = (value: unknown): boolean => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return true;
  if (["nao", "não", "n", "false", "0", "sintetica", "sintética", "s.", "sint"].includes(raw)) return false;
  if (raw === "s") return true; // "S" ambíguo → assume Sim
  if (["sim", "yes", "y", "true", "1", "analitica", "analítica", "a"].includes(raw)) return true;
  return true;
};

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

    // Formato atual: { items: [{cr, conta, descricao, analitica}] }
    if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.items)) {
      const items: PlanoContasItem[] = parsed.items
        .map((i: any) => {
          const cr = String(
            i.cr ?? i.codigo_reduzido ?? i.codigo ?? "",
          ).trim();
          const conta = String(i.conta ?? i.codigo_completo ?? "").trim();
          const descricao = String(i.descricao ?? "").trim();
          const analitica = i.analitica === undefined ? true : parseAnalitica(i.analitica);
          return { cr: cr || conta, conta, descricao, analitica };
        })
        .filter((i: PlanoContasItem) => i.cr);
      return { items };
    }

    // Formato antigo: [{ codigo, descricao }]
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

    // Formatos legados (planilha bruta)
    const arr = Array.isArray(parsed) && parsed[0]?.data ? parsed[0].data : Array.isArray(parsed) ? parsed : [];
    const items: PlanoContasItem[] = [];
    for (const item of arr) {
      const cr = String(
        item["Codigo reduzido"] || item["codigo_reduzido"] || item["CR"] || item["C.R."] || "",
      ).trim();
      const conta = String(item["Conta"] || item["conta"] || "").trim();
      const descricao = String(item["Descrição"] || item["descricao"] || item["Descrição da conta"] || "").trim();
      if (cr) items.push({ cr, conta, descricao, analitica: parseAnalitica(item["Analitica"] ?? item["Analítica"]) });
    }
    return { items };
  } catch {
    return empty;
  }
};

/** Serializa para gravação no banco. */
export const serializePlanoContas = (items: PlanoContasItem[]): string => {
  const cleanItems = items
    .map((i) => ({
      cr: (i.cr || "").trim(),
      conta: (i.conta || "").trim(),
      descricao: (i.descricao || "").trim(),
      analitica: i.analitica !== false,
    }))
    .filter((i) => i.cr);
  return JSON.stringify({ items: cleanItems });
};

/** Constrói o map de códigos (CR e conta completa, com aliases) → descrição. */
export const buildPlanoContasMap = (items: PlanoContasItem[]): PlanoContasMap => {
  const map: PlanoContasMap = {};
  for (const it of items) {
    addPlanoContasAliases(map, it.cr, it.descricao);
    if (it.conta) addPlanoContasAliases(map, it.conta, it.descricao);
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
