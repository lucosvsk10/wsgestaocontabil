
import { useEffect } from "react";
import { Document } from "@/utils/auth/types";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to automatically generate notifications for unviewed documents
 */
export const useViewedDocumentNotifier = (
  documents: Document[], 
  activeCategory: string
) => {
  const { toast } = useToast();

  // Generate notifications for unviewed documents when documents or category changes
  useEffect(() => {
    if (!documents?.length) return;

    // Filter for unviewed documents
    const unviewedDocs = documents.filter(doc => !doc.viewed);
    
    if (unviewedDocs.length === 0) return;
    
    // Process each unviewed document
    unviewedDocs.forEach(doc => {
      // Show toast notification for each unviewed document
      toast({
        title: "Novo documento disponível",
        description: `O documento "${doc.name}" foi adicionado à categoria "${activeCategory}".`,
        duration: 5000,
      });
    });
    
  }, [documents, activeCategory, toast]);
  
  return null;
};
