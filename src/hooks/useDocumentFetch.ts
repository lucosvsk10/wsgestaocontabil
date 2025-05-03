import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Document } from "@/types/admin";
import { useToast } from "@/hooks/use-toast";

export const useDocumentFetch = () => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false); // <- impede chamadas duplicadas

  // Usar useCallback para evitar recriação da função
  const fetchUserDocuments = useCallback(async (userId: string, force = false) => {
    if (!userId) {
      setError("ID do usuário não disponível");
      return;
    }

    // Evita fetch duplicado, a não ser que force=true
    if (hasFetchedRef.current && !force) {
      console.log("fetchUserDocuments ignorado (já buscado antes)");
      return;
    }

    hasFetchedRef.current = true; // marca como já buscado

    setIsLoadingDocuments(true);
    setError(null);

    try {
      console.log("Buscando documentos para o usuário:", userId);

      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", userId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;

      setDocuments(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar documentos:", error);
      setError(error.message || "Erro ao buscar documentos");
      toast({
        variant: "destructive",
        title: "Erro ao carregar documentos",
        description: error.message,
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
    fetchUserDocuments,
  };
};
