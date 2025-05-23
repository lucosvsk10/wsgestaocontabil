
import React from 'react';
import { Document } from '@/types/admin';
import { DocumentGrid } from './DocumentGrid';
import { DesktopDocumentTable } from './DesktopDocumentTable';
import { useIsMobile } from '@/hooks/use-mobile';

export interface DocumentTableProps {
  documents: Document[];
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expirationDate: string) => boolean;
  daysUntilExpiration: (expirationDate: string) => string;
  refreshDocuments: () => void;
  categoryColor?: string;
  loadingDocumentIds?: Set<string>;
  handleDownload?: (document: Document) => Promise<void>;
}

export const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  refreshDocuments,
  categoryColor,
  loadingDocumentIds = new Set(),
  handleDownload = async () => {}
}) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <DocumentGrid
        documents={documents}
        formatDate={formatDate}
        isDocumentExpired={isDocumentExpired}
        daysUntilExpiration={daysUntilExpiration}
        refreshDocuments={refreshDocuments}
        categoryColor={categoryColor}
        loadingDocumentIds={loadingDocumentIds}
        handleDownload={handleDownload}
      />
    );
  }

  return (
    <DesktopDocumentTable
      documents={documents}
      formatDate={formatDate}
      isDocumentExpired={isDocumentExpired}
      daysUntilExpiration={daysUntilExpiration}
      refreshDocuments={refreshDocuments}
    />
  );
};
