
import { Document, DocumentCategory } from "@/types/admin";
import { useIsMobile } from "@/hooks/use-mobile";
import { DocumentTable } from "@/components/client/DocumentTable";

interface CategoryDocumentTableProps {
  documents: Document[];
  category: DocumentCategory;
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
        <div 
          className="w-4 h-4 rounded-full mr-2"
          style={{ backgroundColor: category.color || "#F5C441" }}
        ></div>
        <h3 
          className="text-lg font-medium"
          style={{ color: category.color || "#F5C441" }}
        >
          {category.name}
        </h3>
      </div>
      
      <DocumentTable 
        documents={documents}
        formatDate={formatDate}
        isDocumentExpired={isDocumentExpired}
        daysUntilExpiration={daysUntilExpiration}
        refreshDocuments={refreshDocuments}
        categoryColor={category.color || "#F5C441"}
      />
    </div>
  );
};
