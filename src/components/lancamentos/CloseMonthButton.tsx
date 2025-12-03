import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Download, Loader2, CheckCircle, FileSpreadsheet } from "lucide-react";
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
}

export const CloseMonthButton = ({
  userId,
  competencia,
  documents,
  fechamento,
  onClose
}: CloseMonthButtonProps) => {
  const [isClosing, setIsClosing] = useState(false);

  const processedDocs = documents.filter(d => d.status_processamento === 'concluido');
  const pendingDocs = documents.filter(d => d.status_processamento === 'nao_processado' || d.status_processamento === 'processando');
  const canClose = processedDocs.length > 0 && pendingDocs.length === 0;

  const handleCloseMonth = async () => {
    setIsClosing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('close-month', {
        body: {
          user_id: userId,
          competencia
        }
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

  // Month is already closed
  if (fechamento) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl bg-green-500/5 dark:bg-green-500/10 p-5"
      >
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <div>
            <p className="text-sm font-medium text-foreground">Mês Fechado</p>
            <p className="text-xs text-muted-foreground">
              {fechamento.total_lancamentos} lançamentos
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {fechamento.arquivo_excel_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(fechamento.arquivo_excel_url, '_blank')}
              className="flex-1"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
          )}
          {fechamento.arquivo_csv_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(fechamento.arquivo_csv_url, '_blank')}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Status - Minimalista */}
      {documents.length > 0 && (
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            {processedDocs.length} processado(s)
          </span>
          {pendingDocs.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {pendingDocs.length} pendente(s)
            </span>
          )}
        </div>
      )}

      {/* Close Button */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            disabled={!canClose || isClosing}
            className="w-full"
          >
            {isClosing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Fechar Mês
              </>
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar Mês?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os documentos serão consolidados e uma planilha será gerada. 
              Você não poderá enviar novos documentos para este período.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseMonth}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!canClose && documents.length > 0 && pendingDocs.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Aguarde o processamento de todos os documentos
        </p>
      )}
    </div>
  );
};
