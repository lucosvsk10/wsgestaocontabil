
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Document } from "@/types/admin";
import { useToast } from "@/hooks/use-toast";

export const useDocumentFetch = () => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Usar useCallback para evitar recriação da função em cada renderização
  const fetchUserDocuments = useCallback(async (userId: string) => {
    console.log("Tentando buscar documentos para o usuário:", userId);
    
    if (!userId) {
      console.log("ID do usuário não fornecido, abortando fetch");
      setError("ID do usuário não disponível");
      return;
    }
    
    setIsLoadingDocuments(true);
    setError(null);
    
    try {
      console.log("Iniciando consulta ao Supabase para userId:", userId);
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });
      
      if (error) {
        console.error("Erro Supabase:", error);
        throw error;
      }
      
      console.log("Documentos recebidos:", data ? data.length : 0, data);
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar documentos:', error);
      setError(error.message || "Erro ao buscar documentos");
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
    error,
    fetchUserDocuments
  };
};
