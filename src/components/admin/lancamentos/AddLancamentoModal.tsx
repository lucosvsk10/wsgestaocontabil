import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PlanoContasMap } from "./LancamentosTable";

interface AddLancamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  competencia: string;
  planoContas: PlanoContasMap;
  onSuccess: () => void;
}

export const AddLancamentoModal = ({ isOpen, onClose, clientId, competencia, planoContas, onSuccess }: AddLancamentoModalProps) => {
  const [data, setData] = useState("");
  const [historico, setHistorico] = useState("");
  const [debito, setDebito] = useState("");
  const [credito, setCredito] = useState("");
  const [valor, setValor] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const contasOptions = Object.entries(planoContas).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));

  const handleSave = async () => {
    if (!data || !valor) {
      toast.error("Data e Valor são obrigatórios");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('lancamentos_alinhados')
        .insert({
          user_id: clientId,
          competencia,
          data,
          historico: historico || null,
          debito: debito || null,
          credito: credito || null,
          valor: parseFloat(valor),
        });

      if (error) throw error;

      toast.success("Lançamento adicionado com sucesso!");
      setData(""); setHistorico(""); setDebito(""); setCredito(""); setValor("");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error("Erro ao adicionar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Lançamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Data *</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Histórico</Label>
            <Input value={historico} onChange={(e) => setHistorico(e.target.value)} placeholder="Descrição do lançamento" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Débito</Label>
              <Input value={debito} onChange={(e) => setDebito(e.target.value)} placeholder="Código" list="debito-list" />
              <datalist id="debito-list">
                {contasOptions.map(([cod, desc]) => (
                  <option key={cod} value={cod}>{desc}</option>
                ))}
              </datalist>
              {debito && planoContas[debito] && (
                <p className="text-xs text-muted-foreground truncate">{planoContas[debito]}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Crédito</Label>
              <Input value={credito} onChange={(e) => setCredito(e.target.value)} placeholder="Código" list="credito-list" />
              <datalist id="credito-list">
                {contasOptions.map(([cod, desc]) => (
                  <option key={cod} value={cod}>{desc}</option>
                ))}
              </datalist>
              {credito && planoContas[credito] && (
                <p className="text-xs text-muted-foreground truncate">{planoContas[credito]}</p>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Valor *</Label>
            <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
