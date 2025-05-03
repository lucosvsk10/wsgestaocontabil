
import { useState } from "react";
import { Document } from "@/utils/auth/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileDocumentCard } from "./MobileDocumentCard";
import { DesktopDocumentTable } from "./DesktopDocumentTable";

interface CategoryDocumentTableProps {
  documents: Document[];
  category: string;
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expirationDate: string | null) => boolean;
  daysUntilExpiration: (expirationDate: string | null) => string | null;
  refreshDocuments: () => void;
}

export const CategoryDocumentTable = ({
  documents,
  category,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  refreshDocuments
}: CategoryDocumentTableProps) => {
  const [loadingDocumentIds, setLoadingDocumentIds] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center mb-4">
          <h3 className="text-lg font-medium text-gold">{category}</h3>
        </div>
      
        {documents.length > 0 ? (
          documents.map(doc => (
            <MobileDocumentCard 
              key={doc.id}
              doc={doc}
              formatDate={formatDate}
              isDocumentExpired={isDocumentExpired}
              daysUntilExpiration={daysUntilExpiration}
              refreshDocuments={refreshDocuments}
              loadingDocumentIds={loadingDocumentIds}
            />
          ))
        ) : (
          <div className="text-center py-4 text-gray-400 bg-[#393532] rounded-lg border border-gold/20 p-4">
            Não existem documentos na categoria {category}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <div className="flex items-center mb-4">
        <h3 className="text-gold text-lg font-normal">{category}</h3>
      </div>
      
      <DesktopDocumentTable 
        documents={documents}
        category={category}
        formatDate={formatDate}
        isDocumentExpired={isDocumentExpired}
        daysUntilExpiration={daysUntilExpiration}
        refreshDocuments={refreshDocuments}
        loadingDocumentIds={loadingDocumentIds}
      />
    </div>
  );
};
