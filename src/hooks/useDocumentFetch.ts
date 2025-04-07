
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Document } from "@/types/admin";
import { useToast } from "@/hooks/use-toast";

export const useDocumentFetch = () => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

  const fetchUserDocuments = async (userId: string) => {
    setIsLoadingDocuments(true);
    try {
      const { data, error } = await supabase.from('documents').select('*').eq('user_id', userId).order('uploaded_at', {
        ascending: false
      });
      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar documentos:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar documentos",
        description: error.message
      });
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  return {
    documents,
    setDocuments,
    isLoadingDocuments,
    fetchUserDocuments
  };
};
