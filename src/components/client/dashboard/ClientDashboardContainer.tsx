
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDocumentFetch } from "@/hooks/useDocumentFetch";
import { useDocumentRealtime } from "@/hooks/document/useDocumentRealtime";
import { useViewedDocumentsRealtime } from "@/hooks/document/useViewedDocumentsRealtime";
import { useViewedDocumentNotifier } from "@/hooks/document/useViewedDocumentNotifier";
import { useDocumentCategories } from "@/hooks/document-management/useDocumentCategories";
import { Document } from "@/types/admin";
import { convertToCommonCategories } from "@/utils/document/documentTypeUtils";

export const useClientDashboardLogic = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const {
    documents,
    isLoadingDocuments,
    fetchUserDocuments
  } = useDocumentFetch();
  const { categories, isLoading: isLoadingCategories } = useDocumentCategories();
  const hasInitializedRef = useRef(false);
  const userSelectedRef = useRef(false);

  // Add realtime hooks for notifications and viewed status updates
  useDocumentRealtime();
  useViewedDocumentsRealtime(() => {
    if (user?.id) {
      fetchUserDocuments(user.id);
    }
  });

  // Convert categories to common category type for compatibility
  const commonCategories = convertToCommonCategories(categories);

  // Agrupar documentos por categoria
  const getDocumentsByCategory = (docs: Document[], cats: typeof categories) => {
    const result: Record<string, Document[]> = {};
    
    cats.forEach(cat => {
      result[cat.id] = docs.filter(doc => doc.category === cat.id);
    });
    
    return result;
  };

  // Get documents by category
  const documentsByCategory = getDocumentsByCategory(documents, categories);

  // Use our new notification hook for unviewed documents
  useViewedDocumentNotifier(documents, selectedCategory ? categories.find(c => c.id === selectedCategory)?.name || "" : "Todos os documentos");

  // Load user documents
  useEffect(() => {
    if (user?.id) {
      fetchUserDocuments(user.id);
    }
  }, [user, fetchUserDocuments]);

  // Find the category with the most recent document - only on first render
  useEffect(() => {
    // Only execute when documents are loaded and categories are loaded and not yet initialized
    if (!hasInitializedRef.current && !isLoadingDocuments && !isLoadingCategories && documents.length > 0 && categories.length > 0) {
      // Only auto-select if the user hasn't manually selected yet
      if (!userSelectedRef.current) {
        let mostRecentCategory: string | null = null;
        let mostRecentDate: Date | null = null;

        // Check all categories to find the most recent document
        categories.forEach(category => {
          const docsInCategory = documentsByCategory[category.id] || [];
          if (docsInCategory.length > 0) {
            // Sort documents by upload date (most recent first)
            const sortedDocs = [...docsInCategory].sort((a, b) => 
              new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
            );
            const mostRecentInCategory = sortedDocs[0];
            const docDate = new Date(mostRecentInCategory.uploaded_at);

            // Check if this is the most recent across all categories
            if (!mostRecentDate || docDate > mostRecentDate) {
              mostRecentDate = docDate;
              mostRecentCategory = category.id;
            }
          }
        });

        // Select the category with the most recent document or first one with documents
        if (mostRecentCategory) {
          setSelectedCategory(mostRecentCategory);
        } else if (categories.some(cat => documentsByCategory[cat.id]?.length > 0)) {
          // Fallback: select first category that has documents
          const firstCategoryWithDocs = categories.find(cat => 
            documentsByCategory[cat.id]?.length > 0
          );
          setSelectedCategory(firstCategoryWithDocs?.id || categories[0].id);
        } else {
          // Final fallback: first available category
          setSelectedCategory(categories[0]?.id || null);
        }
      }

      // Mark as initialized to avoid future runs
      hasInitializedRef.current = true;
    }
  }, [documents, isLoadingDocuments, categories, isLoadingCategories, documentsByCategory]);

  // Function to change the selected category (for use in DocumentTabs)
  const handleCategoryChange = (newCategory: string | null) => {
    if (newCategory) {
      setSelectedCategory(newCategory);
      // Mark that the user made a manual selection
      userSelectedRef.current = true;
    }
  };

  return {
    user,
    selectedCategory,
    setSelectedCategory: handleCategoryChange,
    isMobile,
    documents,
    isLoadingDocuments,
    isLoadingCategories,
    fetchUserDocuments,
    commonCategories,
    documentsByCategory
  };
};
