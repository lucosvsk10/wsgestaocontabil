
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Document } from "@/types/admin";
import { useAuth } from "@/contexts/AuthContext";
import { useDocumentActions } from "./useDocumentActions";

export const useDocumentRealtime = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newDocument, setNewDocument] = useState<Document | null>(null);
  
  // Usar o hook useDocumentActions para acessar handleDownload
  const { handleDownload } = useDocumentActions();

  // Função para baixar o documento da notificação
  const handleDownloadNotifiedDocument = async () => {
    if (!newDocument) return;
    
    try {
      await handleDownload(newDocument);
      
      // Limpar a notificação após download
      setNewDocument(null);
    } catch (error) {
      console.error("Erro ao baixar documento notificado:", error);
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    // Inscrever-se para atualizações em tempo real na tabela documents
    const channel = supabase
      .channel('document-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'documents',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Novo documento detectado:", payload);
          
          // Obter os dados do novo documento
          const newDoc = payload.new as Document;
          
          // Atualizar estado com o novo documento
          setNewDocument(newDoc);
          
          // Mostrar toast de notificação
          toast({
            title: "Novo documento disponível",
            description: (
              <div className="flex flex-col space-y-2">
                <p>O documento "{newDoc.name}" foi adicionado à categoria "{newDoc.category}".</p>
                <button 
                  onClick={handleDownloadNotifiedDocument}
                  className="bg-gold hover:bg-gold-dark text-navy py-1 px-3 rounded text-sm font-medium"
                >
                  Baixar agora
                </button>
              </div>
            ),
            duration: 10000, // 10 segundos
          });
        }
      )
      .subscribe();
      
    console.log("Canal de notificações de documentos inscrito");

    // Limpar inscrição quando o componente desmontar
    return () => {
      console.log("Removendo canal de notificações de documentos");
      supabase.removeChannel(channel);
    };
  }, [user?.id, toast]);

  return {
    newDocument,
    handleDownloadNotifiedDocument,
    clearNotification: () => setNewDocument(null)
  };
};
