
import { useMemo, useEffect } from "react";
import { Document, DocumentCategory } from "@/types/common";
import { DocumentTabsDesktop } from "./DocumentTabsDesktop";
import { DocumentTabsMobile } from "./DocumentTabsMobile";
import { useIsMobile } from "@/hooks/use-mobile";

interface DocumentTabsContainerProps {
  documents: Document[];
  allDocuments: Document[];
  documentsByCategory: Record<string, Document[]>;
  categories: DocumentCategory[];
  setSelectedCategory: (category: string | null) => void;
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expiresAt: string | null) => boolean;
  daysUntilExpiration: (expiresAt: string | null) => string | null;
  refreshDocuments: () => void;
  activeCategory: string;
}

export const DocumentTabsContainer = ({
  allDocuments,
  documentsByCategory,
  categories,
  setSelectedCategory,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  refreshDocuments,
  activeCategory
}: DocumentTabsContainerProps) => {
  const isMobile = useIsMobile();

  // Reorganizar categorias por número de documentos (das que têm mais para as que têm menos)
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const docsA = documentsByCategory[a.id]?.length || 0;
      const docsB = documentsByCategory[b.id]?.length || 0;
      return docsB - docsA;
    });
  }, [categories, documentsByCategory]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  // Encontrar a primeira categoria com documentos se a atual não tiver ou não existir
  useEffect(() => {
    if (!activeCategory || !documentsByCategory[activeCategory] || documentsByCategory[activeCategory].length === 0) {
      const firstCategoryWithDocs = sortedCategories.find(cat => 
        documentsByCategory[cat.id] && documentsByCategory[cat.id].length > 0
      );
      
      if (firstCategoryWithDocs) {
        setSelectedCategory(firstCategoryWithDocs.id);
      }
    }
  }, [activeCategory, documentsByCategory, sortedCategories, setSelectedCategory]);

  const commonProps = {
    documentsByCategory,
    categories: sortedCategories,
    activeCategory,
    onCategoryChange: handleCategoryChange,
    formatDate,
    isDocumentExpired,
    daysUntilExpiration,
    refreshDocuments
  };

  return isMobile ? (
    <DocumentTabsMobile {...commonProps} />
  ) : (
    <DocumentTabsDesktop {...commonProps} />
  );
};
