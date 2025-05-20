
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppDocument } from '@/types/admin';

interface UseDocumentRealtimeProps {
  userId: string | null;
  onDocumentChange: () => void;
}

export const useDocumentRealtime = ({ userId, onDocumentChange }: UseDocumentRealtimeProps) => {
  useEffect(() => {
    if (!userId) return;
    
    // Criar um canal de tempo real específico para este usuário
    const channel = supabase
      .channel(`documents-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',  // Monitorar todos os eventos (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'documents',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Documento alterado:', payload);
          onDocumentChange();
        }
      )
      .subscribe();
    
    // Limpar inscrição quando o componente desmontar
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onDocumentChange]);
};
