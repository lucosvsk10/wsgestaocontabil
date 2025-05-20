
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useViewedDocumentNotifier = () => {
  const { toast } = useToast();
  
  const markDocumentAsViewed = useCallback(async (documentId: string, userId: string) => {
    if (!documentId || !userId) return;
    
    try {
      // Verificar se o documento já foi visualizado
      const { data: existingView } = await supabase
        .from('visualized_documents')
        .select('*')
        .eq('document_id', documentId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (existingView) {
        return; // Documento já foi visualizado, não faz nada
      }
      
      // Registrar visualização do documento
      const { error } = await supabase
        .from('visualized_documents')
        .insert({
          document_id: documentId,
          user_id: userId
        });
      
      if (error) throw error;
      
      // Atualizar também o próprio documento para indicar que foi visualizado
      await supabase
        .from('documents')
        .update({
          viewed: true,
          viewed_at: new Date().toISOString()
        })
        .eq('id', documentId);
        
    } catch (error: any) {
      console.error('Erro ao marcar documento como visualizado:', error);
      toast({
        variant: "destructive",
        title: "Erro ao registrar visualização",
        description: "Não foi possível marcar o documento como visualizado."
      });
    }
  }, [toast]);
  
  return { markDocumentAsViewed };
};
