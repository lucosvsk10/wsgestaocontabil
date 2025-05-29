
import { DocumentTabsContainer } from "./document-tabs/DocumentTabsContainer";
import { Document, DocumentCategory } from "@/types/common";

interface DocumentTabsProps {
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

export const DocumentTabs = (props: DocumentTabsProps) => {
  return <DocumentTabsContainer {...props} />;
};
