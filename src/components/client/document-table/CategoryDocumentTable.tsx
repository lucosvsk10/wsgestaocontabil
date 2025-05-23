
import React from 'react';
import { Document } from '@/types/admin';
import { DocumentTable } from './index';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DocumentCategory } from '@/types/common';

interface CategoryDocumentTableProps {
  documents: Document[];
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expirationDate: string) => boolean;
  daysUntilExpiration: (expirationDate: string) => string;
  refreshDocuments: () => void;
  categoryColor?: string;
  category?: DocumentCategory;
  title?: string;
}

export const CategoryDocumentTable: React.FC<CategoryDocumentTableProps> = ({
  documents,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  refreshDocuments,
  categoryColor,
  category,
  title
}) => {
  // Use category name if provided, otherwise use title or default
  const displayTitle = category?.name || title || 'Documentos';

  if (!documents || documents.length === 0) {
    return (
      <Card className="mb-6 border border-[#e6e6e6] dark:border-gold/30 bg-white dark:bg-transparent">
        <CardHeader className="py-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: categoryColor || category?.color || '#efc349' }}
            ></div>
            <h3 className="text-lg font-medium text-[#020817] dark:text-gold">{displayTitle}</h3>
          </div>
          <span className="text-sm text-[#6b7280] dark:text-[#d9d9d9]">
            0 documentos
          </span>
        </CardHeader>
        <CardContent className="py-4">
          <div className="text-center py-8 text-[#6b7280] dark:text-gray-400">
            Nenhum documento nesta categoria
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border border-[#e6e6e6] dark:border-gold/30 bg-white dark:bg-transparent">
      <CardHeader className="py-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: categoryColor || category?.color || '#efc349' }}
          ></div>
          <h3 className="text-lg font-medium text-[#020817] dark:text-gold">{displayTitle}</h3>
        </div>
        <span className="text-sm text-[#6b7280] dark:text-[#d9d9d9]">
          {documents.length} documento{documents.length !== 1 ? 's' : ''}
        </span>
      </CardHeader>
      <CardContent className="py-4">
        <DocumentTable 
          documents={documents} 
          formatDate={formatDate}
          isDocumentExpired={isDocumentExpired}
          daysUntilExpiration={daysUntilExpiration}
          refreshDocuments={refreshDocuments}
          categoryColor={categoryColor || category?.color}
          loadingDocumentIds={new Set()}
          handleDownload={async () => {}}
        />
      </CardContent>
    </Card>
  );
};
