
import { DocumentTabs } from './DocumentTabs';

interface ClientNavigationProps {
  documents: any[];
  allDocuments: any[];
  documentsByCategory: Record<string, any[]>;
  categories: any[];
  setSelectedCategory: (category: string | null) => void;
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expiresAt: string | null) => boolean;
  daysUntilExpiration: (expiresAt: string | null) => string | null;
  refreshDocuments: () => void;
  activeCategory: string;
}

export const ClientNavigation = ({
  documents,
  allDocuments,
  documentsByCategory,
  categories,
  setSelectedCategory,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  refreshDocuments,
  activeCategory
}: ClientNavigationProps) => {
  return (
    <DocumentTabs
      documents={documents}
      allDocuments={allDocuments}
      documentsByCategory={documentsByCategory}
      categories={categories}
      setSelectedCategory={setSelectedCategory}
      formatDate={formatDate}
      isDocumentExpired={isDocumentExpired}
      daysUntilExpiration={daysUntilExpiration}
      refreshDocuments={refreshDocuments}
      activeCategory={activeCategory}
    />
  );
};
