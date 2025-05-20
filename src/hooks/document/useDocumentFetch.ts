
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppDocument } from "@/types/admin";
import { useToast } from "@/hooks/use-toast";

export const useDocumentFetch = () => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  
  // Fetch documents for a specific user
  const fetchUserDocuments = useCallback(async (userId: string) => {
    if (!userId) return;
    
    setIsLoadingDocuments(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar documentos",
        description: error.message
      });
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [toast]);

  return {
    documents,
    setDocuments,
    isLoadingDocuments,
    fetchUserDocuments
  };
};
