
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Document, DocumentCategory } from "@/types/common";
import { CategoryDocumentTable } from "../document-table/CategoryDocumentTable";
import { convertToAdminDocuments } from "@/utils/document/documentTypeUtils";

interface DocumentTabsDesktopProps {
  documentsByCategory: Record<string, Document[]>;
  categories: DocumentCategory[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expiresAt: string | null) => boolean;
  daysUntilExpiration: (expiresAt: string | null) => string | null;
  refreshDocuments: () => void;
}

export const DocumentTabsDesktop = ({
  documentsByCategory,
  categories,
  activeCategory,
  onCategoryChange,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  refreshDocuments
}: DocumentTabsDesktopProps) => {
  return (
    <Tabs 
      value={activeCategory}
      onValueChange={onCategoryChange}
      className="w-full"
    >
      <TabsList className="mb-4 border-gold/20 bg-orange-200/60 dark:bg-transparent dark:border dark:border-gold/30">
        {categories.map(category => (
          <TabsTrigger 
            key={category.id} 
            value={category.id}
            disabled={!documentsByCategory[category.id] || documentsByCategory[category.id].length === 0}
            className="relative text-navy dark:text-[#d9d9d9] dark:data-[state=active]:text-deepNavy"
            style={{
              "--tab-active-bg": category.color || "#F5C441",
              "--tab-active-text": "#fff",
            } as React.CSSProperties}
          >
            <div className="flex items-center">
              {category.name}
              {documentsByCategory[category.id]?.length > 0 && (
                <span className="ml-2 bg-gray-200/50 dark:bg-white/10 rounded-full px-2 py-0.5 text-xs">
                  {documentsByCategory[category.id].length}
                </span>
              )}
            </div>
          </TabsTrigger>
        ))}
      </TabsList>
      
      {categories.map(category => {
        const adminDocuments = convertToAdminDocuments(documentsByCategory[category.id] || []);
        return (
          <TabsContent key={category.id} value={category.id}>
            <CategoryDocumentTable 
              documents={adminDocuments}
              category={category}
              categoryColor={category.color}
              formatDate={formatDate}
              isDocumentExpired={isDocumentExpired}
              daysUntilExpiration={daysUntilExpiration}
              refreshDocuments={refreshDocuments}
            />
          </TabsContent>
        );
      })}
    </Tabs>
  );
};
