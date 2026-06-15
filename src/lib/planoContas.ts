import { supabase } from "@/integrations/supabase/client";

export interface PlanoContasItem {
  codigo: string;
  descricao: string;
}

export type PlanoContasMap = Record<string, string>;

export const parsePlanoContasContent = (conteudo: string): PlanoContasItem[] => {
  try {
    const parsed = JSON.parse(conteudo);
    if (Array.isArray(parsed) && parsed.length > 0 && "codigo" in parsed[0]) {
      return parsed.map((i: any) => ({
        codigo: String(i.codigo || "").trim(),
        descricao: String(i.descricao || "").trim(),
      })).filter((i) => i.codigo);
    }
    const items = Array.isArray(parsed) && parsed[0]?.data
      ? parsed[0].data
      : Array.isArray(parsed) ? parsed : [];
    const out: PlanoContasItem[] = [];
    for (const item of items) {
      const codigo = String(item["Codigo reduzido"] || item["codigo_reduzido"] || item["CR"] || item["C.R."] || "").trim();
      const descricao = String(item["Descrição"] || item["descricao"] || item["Descrição da conta"] || "").trim();
      if (codigo) out.push({ codigo, descricao });
    }
    return out;
  } catch {
    return [];
  }
};

export const fetchPlanoContas = async (
  clientId: string,
): Promise<{ items: PlanoContasItem[]; map: PlanoContasMap }> => {
  const { data } = await supabase
    .from("planos_contas")
    .select("conteudo")
    .eq("user_id", clientId)
    .maybeSingle();

  const items = data?.conteudo ? parsePlanoContasContent(data.conteudo) : [];
  const map: PlanoContasMap = {};
  for (const it of items) map[it.codigo] = it.descricao;
  return { items, map };
};
