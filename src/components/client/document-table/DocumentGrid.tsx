
import { Document } from "@/utils/auth/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { DocumentCard } from "./DocumentCard";
import { DesktopDocumentTable } from "./DesktopDocumentTable";

interface DocumentGridProps {
  documents: Document[];
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expiresAt: string | null) => boolean;
  daysUntilExpiration: (expiresAt: string | null) => string | null;
  refreshDocuments: () => void;
  loadingDocumentIds?: Set<string>;
  handleDownload?: (doc: Document) => Promise<void>;
  categoryColor?: string; // Adicionar a tipagem para categoryColor
}

export const DocumentGrid = ({
  documents,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  refreshDocuments,
  loadingDocumentIds = new Set(),
  handleDownload,
  categoryColor
}: DocumentGridProps) => {
  const isMobile = useIsMobile();

  return isMobile ? (
    <div className="grid grid-cols-1 gap-4">
      {documents.map(doc => (
        <DocumentCard
          key={doc.id}
          document={doc}
          formatDate={formatDate}
          isExpired={isDocumentExpired(doc.expires_at || null)}
          daysUntilExpiration={daysUntilExpiration(doc.expires_at || null)}
          isLoading={loadingDocumentIds.has(doc.id)}
          onDownload={handleDownload ? () => handleDownload(doc) : undefined}
          refreshDocuments={refreshDocuments}
          categoryColor={categoryColor} // Passar a cor da categoria
        />
      ))}
    </div>
  ) : (
    <DesktopDocumentTable
      documents={documents}
      formatDate={formatDate}
      isDocumentExpired={isDocumentExpired}
      daysUntilExpiration={daysUntilExpiration}
      loadingDocumentIds={loadingDocumentIds}
      handleDownload={handleDownload}
      refreshDocuments={refreshDocuments}
      categoryColor={categoryColor} // Passar a cor da categoria
    />
  );
};
