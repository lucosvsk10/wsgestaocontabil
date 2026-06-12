import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, ArrowRight, SortAsc, List, Calculator, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { buildSheetData, type ExportMode, type Lancamento } from "./exportBuilders";
import { downloadSheetXlsx } from "./downloadSheet";
import type { PlanoContasMap } from "./LancamentosTable";

interface ExportLancamentosModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  competencia: string;
  totalLancamentos: number;
}

const slug = (s: string) => s.replace(/\s+/g, "_").replace(/[^\w-]/g, "").toLowerCase();

export const ExportLancamentosModal = ({
  isOpen,
  onClose,
  clientId,
  competencia,
  totalLancamentos,
}: ExportLancamentosModalProps) => {
  const [mode, setMode] = useState<ExportMode>("data");
  const [downloading, setDownloading] = useState(false);
  const navigate = useNavigate();

  const handleAction = async () => {
    if (mode === "saldo") {
      onClose();
      navigate(`/admin/lancamentos/${clientId}/exportar/${mode}?competencia=${competencia}`);
      return;
    }

    // Direct download para "data" e "conta"
    setDownloading(true);
    try {
      const [{ data: userData }, { data: lancData }, { data: planoData }] = await Promise.all([
        supabase.from("users").select("name").eq("id", clientId).single(),
        supabase
          .from("lancamentos_alinhados")
          .select("*")
          .eq("user_id", clientId)
          .eq("competencia", competencia)
          .order("data", { ascending: true }),
        supabase.from("planos_contas").select("conteudo").eq("user_id", clientId).maybeSingle(),
      ]);

      const name = userData?.name || "Cliente";
      const lancs = (lancData || []) as Lancamento[];

      let map: PlanoContasMap = {};
      if (planoData?.conteudo) {
        try {
          const parsed = JSON.parse(planoData.conteudo);
          if (Array.isArray(parsed) && parsed.length > 0 && "codigo" in parsed[0]) {
            for (const item of parsed) {
              const code = String(item.codigo || "").trim();
              if (code) map[code] = String(item.descricao || "").trim();
            }
          } else {
            const items = Array.isArray(parsed) && parsed[0]?.data ? parsed[0].data : Array.isArray(parsed) ? parsed : [];
            for (const item of items) {
              const code = String(item["Codigo reduzido"] || item["codigo_reduzido"] || "");
              const desc = item["Descrição"] || item["descricao"] || item["Descrição da conta"] || "";
              if (code) map[code] = desc;
            }
          }
        } catch {
          map = {};
        }
      }

      const sheet = buildSheetData(mode, lancs, map, competencia);
      const filename = `lancamentos_${slug(name)}_${competencia}_${mode}.xlsx`;
      downloadSheetXlsx(sheet, filename, true);
      toast.success("Download iniciado");
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao exportar: " + e.message);
    } finally {
      setDownloading(false);
    }
  };

  const options: { id: ExportMode; icon: typeof SortAsc; title: string; desc: string }[] = [
    { id: "data", icon: SortAsc, title: "Por Data", desc: "Lista única ordenada cronologicamente" },
    { id: "conta", icon: List, title: "Por Conta", desc: "Agrupado por conta contábil com subtotais" },
    { id: "saldo", icon: Calculator, title: "Saldo por Conta", desc: "Resumo com total por conta (abre editor antes do download)" },
  ];

  const isSaldo = mode === "saldo";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !downloading && onClose()}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Exportar Lista
          </DialogTitle>
          <DialogDescription>
            Escolha o formato de exportação ({totalLancamentos} lançamentos).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {options.map((opt) => {
            const Icon = opt.icon;
            const active = mode === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setMode(opt.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                  active ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">{opt.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={downloading} className="rounded-lg">
            Cancelar
          </Button>
          <Button size="sm" onClick={handleAction} disabled={totalLancamentos === 0 || downloading} className="rounded-lg">
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Gerando...
              </>
            ) : isSaldo ? (
              <>
                Continuar para editor
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-1.5" /> Baixar XLSX
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
