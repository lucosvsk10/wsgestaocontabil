
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNotificationsSystem } from '@/hooks/useNotificationsSystem';

export const useDocumentRealtime = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { createNotification } = useNotificationsSystem();

  useEffect(() => {
    // Só adiciona o canal se o usuário estiver autenticado
    if (!user?.id) {
      console.log("Usuário não autenticado, não configurando canal de notificações");
      return;
    }
    
    console.log("Configurando canal de notificações de documentos para o usuário:", user.id);
    
    // Canal para monitorar alterações em documentos
    const channel = supabase
      .channel(`documents-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Mudança detectada nos documentos:", payload);
          
          if (payload.eventType === 'INSERT') {
            const newDocument = payload.new;
            const documentName = newDocument.name || newDocument.filename || newDocument.original_filename || 'Novo documento';
            const documentCategory = newDocument.category || 'Documentações';
            
            // Create a database notification
            createNotification(
              "Novo documento disponível",
              `Um novo documento foi enviado para você: ${documentName}`,
              newDocument.id
            );
            
            // Show a toast notification
            toast({
              title: "Novo documento disponível",
              description: `${documentName} (${documentCategory})`,
            });
          }
        }
      )
      .subscribe();
    
    console.log("Canal de notificações de documentos inscrito");
    
    return () => {
      console.log("Removendo canal de notificações de documentos");
      supabase.removeChannel(channel);
    };
  }, [user, toast, createNotification]);
};
