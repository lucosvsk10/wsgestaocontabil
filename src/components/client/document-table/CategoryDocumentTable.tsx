
import { Document, DocumentCategory } from "@/types/common";
import { useIsMobile } from "@/hooks/use-mobile";
import { DocumentTable } from "@/components/client/DocumentTable";

interface CategoryDocumentTableProps {
  documents: Document[];
  category: DocumentCategory | string;
  categoryColor?: string;
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expirationDate: string | null) => boolean;
  daysUntilExpiration: (expirationDate: string | null) => string | null;
  refreshDocuments: () => void;
}

export const CategoryDocumentTable = ({
  documents,
  category,
  categoryColor,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  refreshDocuments
}: CategoryDocumentTableProps) => {
  const isMobile = useIsMobile();
  
  // Determinar o nome e a cor da categoria
  const categoryName = typeof category === 'string' ? category : category.name;
  const color = categoryColor || (typeof category !== 'string' ? category.color : "#F5C441");
  
  return (
    <div className="dark:bg-transparent">
      <div className="flex items-center mb-4">
        <div 
          className="w-4 h-4 rounded-full mr-2"
          style={{ backgroundColor: color }}
        ></div>
        <h3 
          className="text-lg font-medium"
          style={{ color: color }}
        >
          {categoryName}
        </h3>
      </div>
      
      <DocumentTable 
        documents={documents}
        formatDate={formatDate}
        isDocumentExpired={isDocumentExpired}
        daysUntilExpiration={daysUntilExpiration}
        refreshDocuments={refreshDocuments}
        // Passamos a cor da categoria como uma propriedade separada
        categoryColor={color}
      />
    </div>
  );
};
