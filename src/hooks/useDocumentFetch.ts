
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Document } from "@/types/admin";
import { useToast } from "@/hooks/use-toast";

export const useDocumentFetch = () => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [viewedDocuments, setViewedDocuments] = useState<Record<string, boolean>>({});
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

  // Fetch document view status for the current user
  const fetchViewedDocuments = useCallback(async (userId: string) => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('visualized_documents')
        .select('document_id')
        .eq('user_id', userId);
        
      if (error) throw error;
      
      // Create an object with document IDs as keys for quick lookup
      const viewedDocsMap: Record<string, boolean> = {};
      data.forEach(item => {
        viewedDocsMap[item.document_id] = true;
      });
      
      setViewedDocuments(viewedDocsMap);
      return viewedDocsMap;
    } catch (error: any) {
      console.error('Error fetching viewed documents:', error);
      return {};
    }
  }, []);

  // Fetch user documents with view status
  const fetchUserDocuments = useCallback(async (userId: string) => {
    if (!userId) return;
    
    setIsLoadingDocuments(true);
    try {
      // Fetch viewed documents first
      const viewedDocs = await fetchViewedDocuments(userId);
      
      // Fetch documents through the office-company identity. This includes legacy
      // documents that still carry an older auth user_id but belong to the same company.
      let { data, error } = await (supabase as any)
        .rpc('portal_documents', { _target_user_id: userId });

      // Compatibility fallback while the migration is being applied.
      if (error) {
        console.warn('[Documents] portal_documents RPC unavailable, using direct ownership fallback:', error.message);
        const fallback = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', userId)
          .order('uploaded_at', { ascending: false });
        data = fallback.data;
        error = fallback.error;
      }
      
      if (error) throw error;
      
      // Mark documents as viewed or not viewed
      const docsWithViewStatus = data?.map((doc: any) => ({
        ...doc,
        viewed: viewedDocs ? !!viewedDocs[doc.id] : false
      })) as Document[] || [];
      
      setDocuments(docsWithViewStatus);
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
  }, [toast, fetchViewedDocuments]);

  return {
    documents,
    setDocuments,
    viewedDocuments,
    isLoadingDocuments,
    fetchUserDocuments,
    fetchViewedDocuments
  };
};
