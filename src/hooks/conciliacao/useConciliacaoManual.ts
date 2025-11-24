import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useConciliacaoManual = (onSuccess: () => void) => {
  const { toast } = useToast();

  const vincularDocumento = async (extratoId: string, documentoId: string) => {
    try {
      const { error: extratoError } = await supabase
        .from('extrato_bancario')
        .update({ 
          documento_id: documentoId,
          status: 'conciliado',
          updated_at: new Date().toISOString()
        })
        .eq('id', extratoId);

      if (extratoError) throw extratoError;

      const { error: documentoError } = await supabase
        .from('documentos_conciliacao')
        .update({ 
          status_processamento: 'concluido',
          updated_at: new Date().toISOString()
        })
        .eq('id', documentoId);

      if (documentoError) throw documentoError;

      toast({
        title: "Conciliação realizada",
        description: "O documento foi vinculado com sucesso."
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro na conciliação",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return { vincularDocumento };
};
