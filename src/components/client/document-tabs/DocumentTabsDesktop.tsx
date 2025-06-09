
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
      <TabsList className="mb-6 bg-gray-100 dark:bg-[#0b1320] border border-[#e6e6e6] dark:border-[#efc349]/20 p-1 h-auto">
        {categories.map(category => (
          <TabsTrigger 
            key={category.id} 
            value={category.id}
            disabled={!documentsByCategory[category.id] || documentsByCategory[category.id].length === 0}
            className="relative text-[#020817] dark:text-gray-300 data-[state=active]:bg-[#efc349] data-[state=active]:text-[#020817] dark:data-[state=active]:bg-[#efc349] dark:data-[state=active]:text-[#020817] px-4 py-3 rounded-lg font-extralight transition-all duration-300 hover:bg-gray-200 dark:hover:bg-[#efc349]/10"
          >
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: category.color || "#efc349" }}
              />
              <span>{category.name}</span>
              {documentsByCategory[category.id]?.length > 0 && (
                <span className="ml-2 bg-white/70 dark:bg-black/20 rounded-full px-2 py-0.5 text-xs font-medium">
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
