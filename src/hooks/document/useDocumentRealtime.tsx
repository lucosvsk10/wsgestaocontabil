
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Document } from "@/types/admin";
import { useAuth } from "@/contexts/AuthContext";
import { useDocumentActions } from "./useDocumentActions";
import { useNotifications } from "@/hooks/useNotifications";

export const useDocumentRealtime = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newDocument, setNewDocument] = useState<Document | null>(null);
  const { sendNotification, permissionStatus } = useNotifications();
  
  // Create a no-op function to pass to useDocumentActions since we're not refreshing the list here
  const noopFetchDocuments = async () => {};
  const { downloadDocument } = useDocumentActions(noopFetchDocuments);

  // Function to download the document from notification
  const handleDownloadNotifiedDocument = async () => {
    if (!newDocument) return;
    
    try {
      if (newDocument.storage_key) {
        await downloadDocument(
          newDocument.id, 
          newDocument.storage_key, 
          newDocument.filename || newDocument.original_filename || newDocument.name, 
          user?.id
        );
        
        // Clear notification after download
        setNewDocument(null);
      }
    } catch (error) {
      console.error("Erro ao baixar documento notificado:", error);
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to real-time updates on the documents table
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
          
          // Get new document data
          const newDoc = payload.new as Document;
          
          // Update state with new document
          setNewDocument(newDoc);
          
          // Send browser notification if permission is granted
          if (permissionStatus === 'granted') {
            sendNotification(
              "Novo documento disponível!", 
              {
                body: `Um novo documento foi enviado para você: ${newDoc.name}`,
                icon: "/lovable-uploads/ebbdfdb8-bb18-4548-8b25-3d5982c97873.png",
                tag: `new-document-${newDoc.id}`,
                requireInteraction: true
              }
            );
          }
          
          // Show toast notification
          toast({
            title: "Novo documento disponível",
            description: (
              <div className="flex flex-col space-y-2">
                <p>{newDoc.name}</p>
                <button 
                  onClick={handleDownloadNotifiedDocument}
                  className="bg-gold hover:bg-gold-dark text-navy py-1 px-3 rounded text-sm font-medium"
                >
                  Baixar agora
                </button>
              </div>
            ),
            duration: 10000, // 10 seconds
          });
        }
      )
      .subscribe();
      
    console.log("Canal de notificações de documentos inscrito");

    // Clean up subscription when component unmounts
    return () => {
      console.log("Removendo canal de notificações de documentos");
      supabase.removeChannel(channel);
    };
  }, [user?.id, toast, permissionStatus, sendNotification]);

  return {
    newDocument,
    handleDownloadNotifiedDocument,
    clearNotification: () => setNewDocument(null)
  };
};
