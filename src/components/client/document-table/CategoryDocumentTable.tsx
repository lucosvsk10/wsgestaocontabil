
import { AppDocument } from "@/types/admin";
import { useIsMobile } from "@/hooks/use-mobile";
import { DocumentTable } from "@/components/client/DocumentTable";

interface CategoryDocumentTableProps {
  documents: AppDocument[];
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
  const isMobile = useIsMobile();
  
  return (
    <div>
      <div className="flex items-center mb-4">
        <h3 className={`text-lg font-medium ${isMobile ? 'text-gold' : 'text-gold'}`}>{category}</h3>
      </div>
      
      <DocumentTable 
        documents={documents}
        formatDate={formatDate}
        isDocumentExpired={isDocumentExpired}
        daysUntilExpiration={daysUntilExpiration}
        refreshDocuments={refreshDocuments}
      />
    </div>
  );
};
