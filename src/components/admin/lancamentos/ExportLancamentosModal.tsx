import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, ArrowRight, SortAsc, List, Calculator } from "lucide-react";
import type { ExportMode } from "./exportBuilders";

interface ExportLancamentosModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  competencia: string;
  totalLancamentos: number;
}

export const ExportLancamentosModal = ({
  isOpen,
  onClose,
  clientId,
  competencia,
  totalLancamentos,
}: ExportLancamentosModalProps) => {
  const [mode, setMode] = useState<ExportMode>("data");
  const navigate = useNavigate();

  const handleContinue = () => {
    onClose();
    navigate(`/admin/lancamentos/${clientId}/exportar/${mode}?competencia=${competencia}`);
  };

  const options: { id: ExportMode; icon: typeof SortAsc; title: string; desc: string }[] = [
    { id: "data", icon: SortAsc, title: "Por Data", desc: "Lista única ordenada cronologicamente" },
    { id: "conta", icon: List, title: "Por Conta", desc: "Agrupado por conta contábil com subtotais" },
    { id: "saldo", icon: Calculator, title: "Saldo por Conta", desc: "Resumo com total por conta (Data, Débito, Histórico, Valor, Crédito)" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Exportar Lista
          </DialogTitle>
          <DialogDescription>
            Escolha o formato e abra o editor para revisar antes de baixar ({totalLancamentos} lançamentos).
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
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-lg">
            Cancelar
          </Button>
          <Button size="sm" onClick={handleContinue} disabled={totalLancamentos === 0} className="rounded-lg">
            Continuar para editor
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
