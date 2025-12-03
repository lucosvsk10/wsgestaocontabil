import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileText, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface PlanoContasModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
}

export const PlanoContasModal = ({ isOpen, onClose, clientId, clientName }: PlanoContasModalProps) => {
  const { user } = useAuth();
  const [conteudo, setConteudo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && clientId) {
      fetchPlanoContas();
    }
  }, [isOpen, clientId]);

  const fetchPlanoContas = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('planos_contas')
        .select('id, conteudo')
        .eq('user_id', clientId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConteudo(data.conteudo);
        setExistingId(data.id);
      } else {
        setConteudo("");
        setExistingId(null);
      }
    } catch (error) {
      console.error('Error fetching plano de contas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!conteudo.trim()) {
      toast.error("O plano de contas não pode estar vazio");
      return;
    }

    setIsSaving(true);
    try {
      if (existingId) {
        // Update existing
        const { error } = await supabase
          .from('planos_contas')
          .update({ 
            conteudo: conteudo.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingId);

        if (error) throw error;
        toast.success("Plano de contas atualizado!");
      } else {
        // Insert new
        const { error } = await supabase
          .from('planos_contas')
          .insert({
            user_id: clientId,
            conteudo: conteudo.trim(),
            created_by: user?.id
          });

        if (error) throw error;
        toast.success("Plano de contas cadastrado!");
      }

      onClose();
    } catch (error: any) {
      console.error('Error saving plano de contas:', error);
      toast.error("Erro ao salvar plano de contas");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Plano de Contas - {clientName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <p className="text-sm text-muted-foreground mb-3">
              Cole o plano de contas do cliente abaixo. Este plano será enviado junto com os documentos para o alinhamento contábil.
            </p>
            <Textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder="Cole o plano de contas aqui...&#10;&#10;Exemplo:&#10;1 - ATIVO&#10;1.1 - ATIVO CIRCULANTE&#10;1.1.1 - CAIXA&#10;1.1.2 - BANCOS&#10;..."
              className="min-h-[300px] font-mono text-sm resize-none"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {conteudo.length} caracteres • {conteudo.split('\n').filter(l => l.trim()).length} linhas
            </p>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {existingId ? 'Atualizar' : 'Salvar'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};