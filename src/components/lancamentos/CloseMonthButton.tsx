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

  const processedDocs = documents.filter(d => d.status_processamento === 'processado');
  const pendingDocs = documents.filter(d => d.status_processamento === 'pendente' || d.status_processamento === 'processando');
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

  // Month is already closed - show download options
  if (fechamento) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Mês Fechado
            </h3>
            <p className="text-sm text-muted-foreground">
              {fechamento.total_lancamentos} lançamentos processados
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          {fechamento.arquivo_excel_url && (
            <Button
              variant="outline"
              onClick={() => window.open(fechamento.arquivo_excel_url, '_blank')}
              className="flex-1"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Baixar Excel
            </Button>
          )}
          {fechamento.arquivo_csv_url && (
            <Button
              variant="outline"
              onClick={() => window.open(fechamento.arquivo_csv_url, '_blank')}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar CSV
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Summary */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-muted-foreground">
            {processedDocs.length} processado(s)
          </span>
        </div>
        {pendingDocs.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-muted-foreground">
              {pendingDocs.length} pendente(s)
            </span>
          </div>
        )}
      </div>

      {/* Close Month Button */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="lg"
            disabled={!canClose || isClosing}
            className="w-full h-14 text-lg font-semibold"
          >
            {isClosing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Lock className="h-5 w-5 mr-2" />
                Fechar Mês
              </>
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar Mês?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao fechar o mês, todos os documentos serão processados e uma planilha será gerada. 
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
        <p className="text-center text-sm text-muted-foreground">
          Aguarde o processamento de todos os documentos antes de fechar o mês
        </p>
      )}
    </div>
  );
};
