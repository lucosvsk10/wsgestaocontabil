import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, RefreshCw, Trash2, Plus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Linha {
  codigo: string | null;
  descricao: string;
  referencia: string | null;
  rendimento: number | null;
  desconto: number | null;
  recol_fgts: number | null;
}

interface Transcricao {
  id: string;
  upload_id: string;
  linhas: Linha[];
  total_rendimentos_pdf: number | null;
  total_descontos_pdf: number | null;
  total_recol_fgts_pdf: number | null;
  status: string;
  erro: string | null;
}

interface Props {
  transcricao: Transcricao;
  onChanged: () => void;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number | null) => n == null ? "" : n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const parseMoney = (v: string): number | null => {
  const s = v.trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? round2(n) : null;
};

export const TranscricaoEditor = ({ transcricao, onChanged }: Props) => {
  const [linhas, setLinhas] = useState<Linha[]>(transcricao.linhas || []);
  const [totRend, setTotRend] = useState<number | null>(transcricao.total_rendimentos_pdf);
  const [totDesc, setTotDesc] = useState<number | null>(transcricao.total_descontos_pdf);
  const [totFgts, setTotFgts] = useState<number | null>(transcricao.total_recol_fgts_pdf);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setLinhas(transcricao.linhas || []);
    setTotRend(transcricao.total_rendimentos_pdf);
    setTotDesc(transcricao.total_descontos_pdf);
    setTotFgts(transcricao.total_recol_fgts_pdf);
  }, [transcricao.id, transcricao.status]);

  const sumRend = useMemo(() => round2(linhas.reduce((a, l) => a + (l.rendimento ?? 0), 0)), [linhas]);
  const sumDesc = useMemo(() => round2(linhas.reduce((a, l) => a + (l.desconto ?? 0), 0)), [linhas]);

  const diffRend = totRend == null ? 0 : round2(sumRend - totRend);
  const diffDesc = totDesc == null ? 0 : round2(sumDesc - totDesc);
  const hasDivergencia = Math.abs(diffRend) > 0.01 || Math.abs(diffDesc) > 0.01 || totRend == null || totDesc == null;

  const updateLinha = (idx: number, patch: Partial<Linha>) => {
    setLinhas((prev) => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));
  };
  const removeLinha = (idx: number) => setLinhas((prev) => prev.filter((_, i) => i !== idx));
  const addLinha = () => setLinhas((prev) => [...prev, { codigo: "", descricao: "", referencia: "", rendimento: null, desconto: null, recol_fgts: null }]);

  const handleSaveAndContabilizar = async () => {
    if (hasDivergencia) {
      toast.error("Corrija a divergência antes de gerar os lançamentos.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("folha_transcricoes").update({
        linhas: linhas as any,
        total_rendimentos_pdf: totRend,
        total_descontos_pdf: totDesc,
        total_recol_fgts_pdf: totFgts,
        status: "transcrito",
        erro: null,
      }).eq("id", transcricao.id);
      if (error) throw error;

      setRunning(true);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/contabilizar-folha", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ transcricaoId: transcricao.id }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao contabilizar");
      toast.success(`Lançamentos gerados: ${result.total_lancamentos || 0}`);
      onChanged();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
      setRunning(false);
    }
  };

  const handleReprocessarPDF = async () => {
    if (!window.confirm("Reprocessar o PDF? A transcrição atual e todos os lançamentos gerados serão sobrescritos.")) return;
    setRunning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/transcrever-folha", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ uploadId: transcricao.upload_id }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao reprocessar");
      toast.success("Transcrição refeita");
      onChanged();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-foreground">Transcrição do documento</span>
        {hasDivergencia ? (
          <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Divergência</span>
        ) : (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Confere</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8" onClick={handleReprocessarPDF} disabled={running || saving}>
            {running ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
            Reprocessar PDF
          </Button>
          <Button size="sm" className="h-8" onClick={handleSaveAndContabilizar} disabled={saving || running || hasDivergencia}>
            {saving || running ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            Salvar e gerar lançamentos
          </Button>
        </div>
      </div>

      {transcricao.erro && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-950/30 text-xs text-red-700 dark:text-red-300 border-b border-red-200 dark:border-red-900 whitespace-pre-wrap">
          {transcricao.erro}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-2 py-2 text-left w-16">Cód.</th>
              <th className="px-2 py-2 text-left">Descrição</th>
              <th className="px-2 py-2 text-right w-24">Referência</th>
              <th className="px-2 py-2 text-right w-28">Rendimentos</th>
              <th className="px-2 py-2 text-right w-28">Descontos</th>
              <th className="px-2 py-2 text-right w-28">Recol FGTS</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, idx) => (
              <tr key={idx} className="border-t border-border/50">
                <td className="px-1 py-1"><Input value={l.codigo ?? ""} onChange={(e) => updateLinha(idx, { codigo: e.target.value })} className="h-7 text-xs" /></td>
                <td className="px-1 py-1"><Input value={l.descricao} onChange={(e) => updateLinha(idx, { descricao: e.target.value })} className="h-7 text-xs" /></td>
                <td className="px-1 py-1"><Input value={l.referencia ?? ""} onChange={(e) => updateLinha(idx, { referencia: e.target.value })} className="h-7 text-xs text-right" /></td>
                <td className="px-1 py-1"><Input value={fmt(l.rendimento)} onChange={(e) => updateLinha(idx, { rendimento: parseMoney(e.target.value) })} className="h-7 text-xs text-right font-mono" /></td>
                <td className="px-1 py-1"><Input value={fmt(l.desconto)} onChange={(e) => updateLinha(idx, { desconto: parseMoney(e.target.value) })} className="h-7 text-xs text-right font-mono" /></td>
                <td className="px-1 py-1"><Input value={fmt(l.recol_fgts)} onChange={(e) => updateLinha(idx, { recol_fgts: parseMoney(e.target.value) })} className="h-7 text-xs text-right font-mono" /></td>
                <td className="px-1"><Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeLinha(idx)}><Trash2 className="w-3 h-3" /></Button></td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted/30 border-t border-border">
            <tr>
              <td colSpan={3} className="px-2 py-2 text-right font-semibold">Somatório planilha</td>
              <td className="px-2 py-2 text-right font-mono font-semibold">{fmt(sumRend)}</td>
              <td className="px-2 py-2 text-right font-mono font-semibold">{fmt(sumDesc)}</td>
              <td colSpan={2} />
            </tr>
            <tr>
              <td colSpan={3} className="px-2 py-2 text-right text-muted-foreground">Total oficial do PDF</td>
              <td className="px-1 py-1"><Input value={fmt(totRend)} onChange={(e) => setTotRend(parseMoney(e.target.value))} className="h-7 text-xs text-right font-mono" /></td>
              <td className="px-1 py-1"><Input value={fmt(totDesc)} onChange={(e) => setTotDesc(parseMoney(e.target.value))} className="h-7 text-xs text-right font-mono" /></td>
              <td className="px-1 py-1"><Input value={fmt(totFgts)} onChange={(e) => setTotFgts(parseMoney(e.target.value))} className="h-7 text-xs text-right font-mono" /></td>
              <td />
            </tr>
            <tr>
              <td colSpan={3} className="px-2 py-2 text-right text-muted-foreground">Diferença</td>
              <td className={cn("px-2 py-2 text-right font-mono", Math.abs(diffRend) > 0.01 ? "text-red-600" : "text-emerald-600")}>{fmt(diffRend)}</td>
              <td className={cn("px-2 py-2 text-right font-mono", Math.abs(diffDesc) > 0.01 ? "text-red-600" : "text-emerald-600")}>{fmt(diffDesc)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="px-4 py-2 border-t border-border">
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={addLinha}><Plus className="w-3 h-3 mr-1" /> Adicionar linha</Button>
      </div>
    </div>
  );
};
