import { Document } from "@/utils/auth/types";
import { DocumentCard } from "./DocumentCard";

interface DocumentGridProps {
  documents: Document[];
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expiresAt: string | null) => boolean;
  daysUntilExpiration: (expiresAt: string | null) => string | null;
  refreshDocuments: () => void;
  loadingDocumentIds: Set<string>;
  handleDownload: (doc: Document) => Promise<void>;
  categoryColor?: string;
  categories?: Array<{ id: string; name: string; color?: string }>;
}

export const DocumentGrid = ({ documents, formatDate, isDocumentExpired, daysUntilExpiration, refreshDocuments, loadingDocumentIds, handleDownload, categoryColor, categories = [] }: DocumentGridProps) => {
  const getCategoryColor = (doc: Document) => categoryColor || categories.find(cat => cat.id === doc.category)?.color || "#efc349";
  return <div className="client-document-grid">
    {documents.map(doc => <DocumentCard key={doc.id} doc={doc} formatDate={formatDate} isDocumentExpired={isDocumentExpired} daysUntilExpiration={daysUntilExpiration} refreshDocuments={refreshDocuments} loadingDocumentIds={loadingDocumentIds} handleDownload={handleDownload} categoryColor={getCategoryColor(doc)} categories={categories} />)}
  </div>;
};
