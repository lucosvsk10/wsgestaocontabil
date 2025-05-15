
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Document } from '@/types/document';
import { toast } from '@/hooks/use-toast';

export const useDocumentManagement = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  
  const fetchDocuments = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      
      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (user) {
      fetchDocuments(user.id);
    }
  }, [user]);
  
  const deleteDocument = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);
        
      if (error) throw error;
      
      // Update local state
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      
      toast({
        title: "Documento excluído",
        description: "O documento foi removido com sucesso.",
      });
      
      return true;
    } catch (err) {
      console.error('Error deleting document:', err);
      
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o documento.",
        variant: "destructive",
      });
      
      return false;
    }
  };
  
  const markDocumentAsViewed = async (documentId: string) => {
    try {
      // Check if user exists
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase
        .from('documents')
        .update({ viewed: true, viewed_at: new Date().toISOString() })
        .eq('id', documentId);
      
      if (error) throw error;
      
      // Update local state
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === documentId ? { ...doc, viewed: true, viewed_at: new Date().toISOString() } : doc
        )
      );
      
      // Also log the view in visualized_documents table
      const { error: visualError } = await supabase
        .from('visualized_documents')
        .insert({
          user_id: user.id,
          document_id: documentId
        });
      
      if (visualError) {
        console.error('Error logging document view:', visualError);
      }
      
      return true;
    } catch (err) {
      console.error('Error marking document as viewed:', err);
      return false;
    }
  };
  
  return {
    documents,
    loading,
    error,
    deleteDocument,
    markDocumentAsViewed,
    fetchDocuments,
  };
};
