
import { Document } from "@/types/admin";
import { useIsMobile } from "@/hooks/use-mobile";
import { DocumentTable } from "@/components/client/DocumentTable";

interface CategoryDocumentTableProps {
  documents: Document[];
  category: string;
  categoryColor?: string;
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expirationDate: string | null) => boolean;
  daysUntilExpiration: (expirationDate: string | null) => string | null;
  refreshDocuments: () => void;
}

export const CategoryDocumentTable = ({
  documents,
  category,
  categoryColor = "#F5C441", // Cor padrão se não for fornecida
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
          style={{ backgroundColor: categoryColor }}
        ></div>
        <h3 
          className={`text-lg font-medium`}
          style={{ color: categoryColor }}
        >
          {category}
        </h3>
      </div>
      
      <DocumentTable 
        documents={documents}
        formatDate={formatDate}
        isDocumentExpired={isDocumentExpired}
        daysUntilExpiration={daysUntilExpiration}
        refreshDocuments={refreshDocuments}
        categoryColor={categoryColor}
      />
    </div>
  );
};
