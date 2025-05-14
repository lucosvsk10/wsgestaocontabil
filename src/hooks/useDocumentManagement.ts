
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { NotificationService } from '@/hooks/notifications/notificationService';

export const useDocumentManagement = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const notificationService = new NotificationService();

  const fetchDocuments = useCallback(async (userId?: string) => {
    setIsLoading(true);
    try {
      let query = supabase.from('documents').select('*');
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query.order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os documentos',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const downloadDocument = useCallback(async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast({
        title: 'Sucesso',
        description: 'Download iniciado com sucesso!',
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível baixar o documento',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const deleteDocument = useCallback(async (documentId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);
      
      if (error) throw error;
      
      // Send notification to user
      await notificationService.createNotification(
        userId,
        'Um documento foi excluído da sua conta.',
        'delete'
      );
      
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  }, [notificationService]);

  const markDocumentViewed = useCallback(async (documentId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('visualized_documents')
        .insert({
          document_id: documentId,
          user_id: userId
        });
      
      if (error && error.code === '23505') {
        // Unique violation - document already viewed by this user
        return;
      } else if (error) {
        throw error;
      }
      
      // Update document viewed status in UI
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === documentId ? { ...doc, viewed: true } : doc
        )
      );
    } catch (error) {
      console.error('Error marking document as viewed:', error);
    }
  }, []);

  useEffect(() => {
    // This is an empty useEffect for initializing the component
    // fetchDocuments will be called by the component using this hook
  }, []);

  return {
    documents,
    isLoading,
    fetchDocuments,
    downloadDocument,
    deleteDocument,
    markDocumentViewed
  };
};
