import { useState } from "react";
import { Lock, Unlock, Download, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Document {
  id: string;
  status_processamento: string;
}

interface Fechamento {
  id: string;
  arquivo_excel_url?: string;
  arquivo_csv_url?: string;
  total_lancamentos: number;
  created_at: string;
}

interface CloseMonthButtonProps {
  userId: string;
  competencia: string;
  documents: Document[];
  fechamento: Fechamento | null;
  onClose: () => void;
  isAdmin?: boolean;
}

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export const CloseMonthButton = ({
  userId,
  competencia,
  documents,
  fechamento,
  onClose,
  isAdmin = false
}: CloseMonthButtonProps) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isReopening, setIsReopening] = useState(false);

  const processedDocs = documents.filter(d => d.status_processamento === 'concluido');
  const pendingDocs = documents.filter(d => d.status_processamento === 'nao_processado' || d.status_processamento === 'processando');
  const canClose = processedDocs.length > 0 && pendingDocs.length === 0;

  const handleCloseMonth = async () => {
    setIsClosing(true);
    
    try {
      const { error } = await supabase.functions.invoke('close-month', {
        body: { user_id: userId, competencia }
      });

      if (error) throw error;

      toast.success("Mês fechado com sucesso!");
      onClose();
    } catch (error: any) {
      console.error('Error closing month:', error);
      toast.error("Erro ao fechar mês: " + error.message);
    } finally {
      setIsClosing(false);
    }
  };

  const handleReopenMonth = async () => {
    setIsReopening(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/reopen-month', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ user_id: userId, competencia })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao reabrir mês');
      }

      toast.success("Mês reaberto com sucesso!");
      onClose();
    } catch (error: any) {
      console.error('Error reopening month:', error);
      toast.error("Erro ao reabrir mês: " + error.message);
    } finally {
      setIsReopening(false);
    }
  };

  const formatMonth = (comp: string) => {
    const [year, month] = comp.split('-');
    return `${MONTHS[parseInt(month) - 1]}`;
  };

  // Mês fechado
  if (fechamento) {
    return (
      <div className="text-center py-4 space-y-3">
        <div className="flex items-center justify-center gap-1.5 text-green-600 dark:text-green-400">
          <Lock className="w-3.5 h-3.5" />
          <span className="text-sm">Mês Fechado</span>
        </div>
        
        <p className="text-xs text-muted-foreground">
          {fechamento.total_lancamentos} lançamento(s)
        </p>

        <div className="flex items-center justify-center gap-2">
          {fechamento.arquivo_excel_url && (
            <a
              href={fechamento.arquivo_excel_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Download className="w-3 h-3" />
              Excel
            </a>
          )}
          {fechamento.arquivo_csv_url && (
            <a
              href={fechamento.arquivo_csv_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Download className="w-3 h-3" />
              CSV
            </a>
          )}
        </div>

        {/* Botão de reabrir apenas para admin */}
        {isAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isReopening}
                className="mt-2"
              >
                {isReopening ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Reabrindo...
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5 mr-1.5" />
                    Reabrir Mês
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reabrir mês?</AlertDialogTitle>
                <AlertDialogDescription>
                  O cliente poderá enviar novos documentos para este período. 
                  Os arquivos de exportação serão removidos e será necessário fechar o mês novamente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleReopenMonth}>Confirmar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    );
  }

  // Se não for admin, mostrar apenas status (sem botão de fechar)
  if (!isAdmin) {
    return (
      <div className="text-center py-4 space-y-2.5">
        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
            {processedDocs.length} processado(s)
          </span>
          {pendingDocs.length > 0 && (
            <span className="text-amber-500">{pendingDocs.length} pendente(s)</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Aguardando fechamento pelo administrador
        </p>
      </div>
    );
  }

  // Admin pode fechar o mês
  return (
    <div className="text-center py-4 space-y-2.5">
      {/* Status */}
      <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-green-500" />
          {processedDocs.length} ok
        </span>
        {pendingDocs.length > 0 && (
          <span className="text-amber-500">{pendingDocs.length} pendente(s)</span>
        )}
      </div>

      {/* Botão */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            disabled={!canClose || isClosing}
            variant={canClose ? "default" : "outline"}
            size="sm"
          >
            {isClosing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Fechando...
              </>
            ) : (
              `Fechar ${formatMonth(competencia)}`
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar mês?</AlertDialogTitle>
            <AlertDialogDescription>
              Os relatórios serão gerados e você não poderá mais enviar documentos para este período.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseMonth}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!canClose && pendingDocs.length > 0 && (
        <p className="text-xs text-muted-foreground">Aguarde o processamento</p>
      )}
    </div>
  );
};
