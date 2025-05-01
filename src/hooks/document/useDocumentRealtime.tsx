
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const useDocumentRealtime = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Só adiciona o canal se o usuário estiver autenticado
    if (user?.id) {
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
            // Você pode disparar um evento aqui para atualizar os documentos
            // ou usar um contexto global para notificar outros componentes
            
            if (payload.eventType === 'INSERT') {
              toast({
                title: "Novo documento disponível",
                description: "Um novo documento foi adicionado à sua conta.",
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
    }
  }, [user, toast]);
};
