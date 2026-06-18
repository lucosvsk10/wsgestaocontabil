import { supabase } from "@/integrations/supabase/client";

export type PlanoContasPreferencia = "cr" | "completo";

export interface PlanoContasItem {
  /** Código reduzido (C.R.) */
  cr: string;
  /** Código completo / contábil / analítico */
  codigo_completo: string;
  /** Descrição da conta */
  descricao: string;
  /** Código preferido (cópia do cr ou codigo_completo conforme preferencia) — facilita listagens */
  codigo: string;
}

export type PlanoContasMap = Record<string, string>;

export interface PlanoContasParsed {
  items: PlanoContasItem[];
  preferencia: PlanoContasPreferencia;
}

const pickCode = (item: PlanoContasItem, preferencia: PlanoContasPreferencia): string => {
  const primary = preferencia === "completo" ? item.codigo_completo : item.cr;
  if (primary) return primary;
  // fallback para o outro campo se o preferido estiver vazio nesta linha
  return preferencia === "completo" ? item.cr : item.codigo_completo;
};

export const parsePlanoContasContent = (conteudo: string): PlanoContasParsed => {
  const empty: PlanoContasParsed = { items: [], preferencia: "cr" };
  if (!conteudo) return empty;
  try {
    const parsed = JSON.parse(conteudo);

    // Novo formato: { preferencia_ia, items: [...] }
    if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.items)) {
      const preferencia: PlanoContasPreferencia =
        parsed.preferencia_ia === "completo" ? "completo" : "cr";
      const items: PlanoContasItem[] = parsed.items
        .map((i: any) => {
          const cr = String(i.cr ?? i.codigo_reduzido ?? i.codigo ?? "").trim();
          const codigo_completo = String(i.codigo_completo ?? i.codigoCompleto ?? "").trim();
          const descricao = String(i.descricao ?? "").trim();
          const codigo = pickCode({ cr, codigo_completo, descricao, codigo: "" }, preferencia);
          return { cr, codigo_completo, descricao, codigo };
        })
        .filter((i: PlanoContasItem) => i.cr || i.codigo_completo);
      return { items, preferencia };
    }

    // Formato anterior: [{ codigo, descricao }]
    if (Array.isArray(parsed) && parsed.length > 0 && "codigo" in parsed[0]) {
      const items: PlanoContasItem[] = parsed
        .map((i: any) => {
          const cr = String(i.codigo ?? "").trim();
          const descricao = String(i.descricao ?? "").trim();
          return { cr, codigo_completo: "", descricao, codigo: cr };
        })
        .filter((i) => i.cr);
      return { items, preferencia: "cr" };
    }

    // Formatos legados (planilha)
    const arr = Array.isArray(parsed) && parsed[0]?.data ? parsed[0].data : Array.isArray(parsed) ? parsed : [];
    const items: PlanoContasItem[] = [];
    for (const item of arr) {
      const cr = String(item["Codigo reduzido"] || item["codigo_reduzido"] || item["CR"] || item["C.R."] || "").trim();
      const descricao = String(item["Descrição"] || item["descricao"] || item["Descrição da conta"] || "").trim();
      if (cr) items.push({ cr, codigo_completo: "", descricao, codigo: cr });
    }
    return { items, preferencia: "cr" };
  } catch {
    return empty;
  }
};

/** Serializa para gravação no banco. */
export const serializePlanoContas = (
  items: PlanoContasItem[],
  preferencia: PlanoContasPreferencia,
): string => {
  const cleanItems = items
    .map((i) => ({
      cr: (i.cr || "").trim(),
      codigo_completo: (i.codigo_completo || "").trim(),
      descricao: (i.descricao || "").trim(),
    }))
    .filter((i) => i.cr || i.codigo_completo);
  return JSON.stringify({ preferencia_ia: preferencia, items: cleanItems });
};

/** Constrói o map { código preferido → descrição } a partir dos itens já parseados. */
export const buildPlanoContasMap = (
  items: PlanoContasItem[],
  preferencia: PlanoContasPreferencia,
): PlanoContasMap => {
  const map: PlanoContasMap = {};
  for (const it of items) {
    const code = pickCode(it, preferencia);
    if (code) map[code] = it.descricao;
  }
  return map;
};

export const fetchPlanoContas = async (
  clientId: string,
): Promise<{
  items: PlanoContasItem[];
  preferencia: PlanoContasPreferencia;
  map: PlanoContasMap;
}> => {
  const { data } = await supabase
    .from("planos_contas")
    .select("conteudo")
    .eq("user_id", clientId)
    .maybeSingle();

  const { items, preferencia } = data?.conteudo
    ? parsePlanoContasContent(data.conteudo)
    : { items: [], preferencia: "cr" as PlanoContasPreferencia };
  const map = buildPlanoContasMap(items, preferencia);
  return { items, preferencia, map };
};
