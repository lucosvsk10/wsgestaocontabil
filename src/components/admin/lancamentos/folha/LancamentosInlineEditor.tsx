import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Save, RefreshCw, Trash2, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Lancamento {
  id: string;
  data: string | null;
  conta_debito: string | null;
  conta_credito: string | null;
  historico: string | null;
  valor: number | null;
  justificativa: string | null;
  ordem: number;
}

interface Props {
  uploadId: string;
  clientId: string;
  competencia: string;
  transcricaoId?: string;
  transcricaoStatus?: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number | null) => n == null ? "" : n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const parseMoney = (v: string): number | null => {
  const s = v.trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? round2(n) : null;
};

export const LancamentosInlineEditor = ({ uploadId, clientId, competencia, transcricaoId, transcricaoStatus }: Props) => {
  const [linhas, setLinhas] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [removed, setRemoved] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("folha_lancamentos")
      .select("id,data,conta_debito,conta_credito,historico,valor,justificativa,ordem")
      .eq("source_upload_id", uploadId)
      .order("ordem", { ascending: true });
    setLinhas((data || []) as Lancamento[]);
    setDirty({});
    setRemoved([]);
    setLoading(false);
  }, [uploadId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const ch = supabase
      .channel(`folha-lanc-${uploadId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "folha_lancamentos", filter: `source_upload_id=eq.${uploadId}` }, () => {
        if (Object.keys(dirty).length === 0 && removed.length === 0) fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uploadId, fetchData, dirty, removed]);

  const total = useMemo(() => round2(linhas.reduce((a, l) => a + (l.valor ?? 0), 0)), [linhas]);

  const update = (id: string, patch: Partial<Lancamento>) => {
    setLinhas((prev) => prev.map((l) => l.id === id ? { ...l, ...patch } : l));
    setDirty((d) => ({ ...d, [id]: true }));
  };

  const remove = (id: string) => {
    setLinhas((prev) => prev.filter((l) => l.id !== id));
    if (!id.startsWith("new-")) setRemoved((r) => [...r, id]);
  };

  const addLinha = () => {
    const tmpId = `new-${Date.now()}`;
    const maxOrdem = linhas.reduce((a, l) => Math.max(a, l.ordem), 0);
    setLinhas((prev) => [...prev, {
      id: tmpId, data: null, conta_debito: "", conta_credito: "", historico: "", valor: null, justificativa: null, ordem: maxOrdem + 1,
    }]);
    setDirty((d) => ({ ...d, [tmpId]: true }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (removed.length) {
        const { error } = await supabase.from("folha_lancamentos").delete().in("id", removed);
        if (error) throw error;
      }
      const toUpsert = linhas.filter((l) => dirty[l.id]);
      for (const l of toUpsert) {
        if (l.id.startsWith("new-")) {
          const { error } = await supabase.from("folha_lancamentos").insert({
            client_id: clientId,
            competencia,
            source_upload_id: uploadId,
            data: l.data,
            conta_debito: l.conta_debito,
            conta_credito: l.conta_credito,
            historico: l.historico,
            valor: l.valor,
            justificativa: l.justificativa,
            ordem: l.ordem,
          });
          if (error) throw error;
        } else {
          const { error } = await supabase.from("folha_lancamentos").update({
            data: l.data,
            conta_debito: l.conta_debito,
            conta_credito: l.conta_credito,
            historico: l.historico,
            valor: l.valor,
            justificativa: l.justificativa,
            ordem: l.ordem,
          }).eq("id", l.id);
          if (error) throw error;
        }
      }
      toast.success("Lançamentos salvos");
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReprocessar = async () => {
    if (!transcricaoId) { toast.error("Sem transcrição vinculada"); return; }
    if (!window.confirm("Reprocessar contabilização? Os lançamentos atuais serão apagados e regerados pela IA.")) return;
    setRunning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/contabilizar-folha", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ transcricaoId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao contabilizar");
      toast.success(`Lançamentos gerados: ${result.total_lancamentos || 0}`);
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRunning(false);
    }
  };

  const contabilizando = transcricaoStatus === "contabilizando";
  const hasDirty = Object.keys(dirty).length > 0 || removed.length > 0;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-foreground">Lançamentos contábeis</span>
        <span className="text-xs text-muted-foreground">({linhas.length} linhas · total {fmt(total)})</span>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8" onClick={handleReprocessar} disabled={running || saving || !transcricaoId}>
            {running ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
            Reprocessar contabilização
          </Button>
          <Button size="sm" className="h-8" onClick={handleSave} disabled={saving || !hasDirty}>
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            Salvar alterações
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground text-sm"><Loader2 className="w-4 h-4 inline animate-spin mr-2" />Carregando...</div>
      ) : linhas.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-sm">
          {contabilizando ? (
            <><Loader2 className="w-4 h-4 inline animate-spin mr-2" />Gerando lançamentos...</>
          ) : (
            <span className="flex items-center justify-center gap-2"><AlertTriangle className="w-4 h-4" /> Nenhum lançamento gerado ainda.</span>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-2 py-2 text-left w-28">Data</th>
                <th className="px-2 py-2 text-left w-24">Débito</th>
                <th className="px-2 py-2 text-left w-24">Crédito</th>
                <th className="px-2 py-2 text-left">Histórico</th>
                <th className="px-2 py-2 text-right w-28">Valor</th>
                <th className="px-2 py-2 text-left w-64">Justificativa IA</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id} className="border-t border-border/50">
                  <td className="px-1 py-1"><Input type="date" value={l.data ?? ""} onChange={(e) => update(l.id, { data: e.target.value || null })} className="h-7 text-xs" /></td>
                  <td className="px-1 py-1"><Input value={l.conta_debito ?? ""} onChange={(e) => update(l.id, { conta_debito: e.target.value })} className="h-7 text-xs" /></td>
                  <td className="px-1 py-1"><Input value={l.conta_credito ?? ""} onChange={(e) => update(l.id, { conta_credito: e.target.value })} className="h-7 text-xs" /></td>
                  <td className="px-1 py-1"><Input value={l.historico ?? ""} onChange={(e) => update(l.id, { historico: e.target.value })} className="h-7 text-xs" /></td>
                  <td className="px-1 py-1"><Input value={fmt(l.valor)} onChange={(e) => update(l.id, { valor: parseMoney(e.target.value) })} className="h-7 text-xs text-right font-mono" /></td>
                  <td className="px-1 py-1"><Input value={l.justificativa ?? ""} onChange={(e) => update(l.id, { justificativa: e.target.value })} className="h-7 text-xs" /></td>
                  <td className="px-1"><Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => remove(l.id)}><Trash2 className="w-3 h-3" /></Button></td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/30 border-t border-border">
              <tr>
                <td colSpan={4} className="px-2 py-2 text-right font-semibold">Total</td>
                <td className="px-2 py-2 text-right font-mono font-semibold">{fmt(total)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="px-4 py-2 border-t border-border">
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={addLinha}><Plus className="w-3 h-3 mr-1" /> Adicionar linha</Button>
      </div>
    </div>
  );
};
