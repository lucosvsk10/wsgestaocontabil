
import { useState } from 'react';
import { 
  Drawer, 
  DrawerContent, 
  DrawerTrigger 
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Document, DocumentCategory } from "@/types/common";
import { CategoryDocumentTable } from "../document-table/CategoryDocumentTable";
import { convertToAdminDocuments } from "@/utils/document/documentTypeUtils";

interface DocumentTabsMobileProps {
  documentsByCategory: Record<string, Document[]>;
  categories: DocumentCategory[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expiresAt: string | null) => boolean;
  daysUntilExpiration: (expiresAt: string | null) => string | null;
  refreshDocuments: () => void;
}

export const DocumentTabsMobile = ({
  documentsByCategory,
  categories,
  activeCategory,
  onCategoryChange,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  refreshDocuments
}: DocumentTabsMobileProps) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.color || "#F5C441";
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "Categoria";
  };

  const handleCategoryChange = (category: string) => {
    onCategoryChange(category);
    setIsDrawerOpen(false);
  };

  return (
    <div className="w-full">
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerTrigger asChild>
          <Button 
            variant="document" 
            className="w-full mb-4 justify-between font-medium text-white border-gold/20"
            style={{
              backgroundColor: getCategoryColor(activeCategory),
              borderColor: `${getCategoryColor(activeCategory)}60`,
            }}
          >
            <div className="flex items-center">
              <Menu className="mr-2 h-4 w-4" />
              <span>{getCategoryName(activeCategory)}</span>
            </div>
          </Button>
        </DrawerTrigger>
        <DrawerContent className="bg-orange-100 dark:bg-deepNavy border-t border-gold/20 p-4">
          <div className="max-w-md mx-auto">
            <div className="space-y-2">
              {categories.map((category) => (
                <div 
                  key={category.id}
                  className="relative"
                >
                  <Button 
                    variant="document"
                    className="w-full justify-between text-navy dark:text-[#d9d9d9]"
                    style={{
                      backgroundColor: category.id === activeCategory ? category.color || "#F5C441" : "transparent",
                      color: category.id === activeCategory ? "#fff" : "inherit",
                      borderColor: `${category.color || "#F5C441"}40`
                    }}
                    disabled={!documentsByCategory[category.id] || documentsByCategory[category.id].length === 0}
                    onClick={() => handleCategoryChange(category.id)}
                  >
                    <div className="flex items-center">
                      <span>{category.name}</span>
                      {documentsByCategory[category.id]?.length > 0 && (
                        <span className="ml-2 bg-white/20 rounded-full px-2 py-0.5 text-xs">
                          {documentsByCategory[category.id].length}
                        </span>
                      )}
                    </div>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
      
      {categories.map((category) => {
        const adminDocuments = convertToAdminDocuments(documentsByCategory[category.id] || []);
        return (
          <div key={category.id} className={category.id === activeCategory ? 'block' : 'hidden'}>
            <CategoryDocumentTable 
              documents={adminDocuments}
              category={category}
              categoryColor={category.color}
              formatDate={formatDate}
              isDocumentExpired={isDocumentExpired}
              daysUntilExpiration={daysUntilExpiration}
              refreshDocuments={refreshDocuments}
            />
          </div>
        );
      })}
    </div>
  );
};
