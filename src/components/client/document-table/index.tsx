
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
}

export const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  refreshDocuments,
  categoryColor
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
      categoryColor={categoryColor}
    />
  );
};
