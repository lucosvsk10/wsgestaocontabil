
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Document, DocumentCategory } from "@/types/common";
import { CategoryDocumentTable } from "./document-table/CategoryDocumentTable";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useMemo, useEffect } from "react";
import { 
  Drawer, 
  DrawerContent, 
  DrawerTrigger 
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface DocumentTabsProps {
  documents: Document[];
  allDocuments: Document[];
  documentsByCategory: Record<string, Document[]>;
  categories: DocumentCategory[];
  setSelectedCategory: (category: string | null) => void;
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expiresAt: string | null) => boolean;
  daysUntilExpiration: (expiresAt: string | null) => string | null;
  refreshDocuments: () => void;
  activeCategory: string;
}

export const DocumentTabs = ({
  allDocuments,
  documentsByCategory,
  categories,
  setSelectedCategory,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  refreshDocuments,
  activeCategory
}: DocumentTabsProps) => {
  const isMobile = useIsMobile();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Reorganizar categorias por número de documentos (das que têm mais para as que têm menos)
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const docsA = documentsByCategory[a.id]?.length || 0;
      const docsB = documentsByCategory[b.id]?.length || 0;
      return docsB - docsA;
    });
  }, [categories, documentsByCategory]);
  
  // Função para obter a cor da categoria selecionada
  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.color || "#F5C441";
  };

  // Função para obter o nome da categoria
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "Categoria";
  };
  
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setIsDrawerOpen(false);
  };

  // Encontrar a primeira categoria com documentos se a atual não tiver ou não existir
  useEffect(() => {
    if (!activeCategory || !documentsByCategory[activeCategory] || documentsByCategory[activeCategory].length === 0) {
      const firstCategoryWithDocs = sortedCategories.find(cat => 
        documentsByCategory[cat.id] && documentsByCategory[cat.id].length > 0
      );
      
      if (firstCategoryWithDocs) {
        setSelectedCategory(firstCategoryWithDocs.id);
      }
    }
  }, [activeCategory, documentsByCategory, sortedCategories, setSelectedCategory]);

  return isMobile ? (
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
        <DrawerContent className="bg-orange-100 dark:bg-[#2d2a28] border-t border-gold/20 p-4">
          <div className="max-w-md mx-auto">
            <div className="space-y-2">
              {sortedCategories.map((category) => (
                <div 
                  key={category.id}
                  className="relative"
                >
                  <Button 
                    variant="document"
                    className="w-full justify-between text-navy dark:text-white"
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
      
      {sortedCategories.map((category) => (
        <div key={category.id} className={category.id === activeCategory ? 'block' : 'hidden'}>
          <CategoryDocumentTable 
            documents={documentsByCategory[category.id] || []}
            category={category}
            categoryColor={category.color}
            formatDate={formatDate}
            isDocumentExpired={isDocumentExpired}
            daysUntilExpiration={daysUntilExpiration}
            refreshDocuments={refreshDocuments}
          />
        </div>
      ))}
    </div>
  ) : (
    <Tabs 
      defaultValue={activeCategory} 
      value={activeCategory}
      onValueChange={handleCategoryChange}
      className="w-full"
    >
      <TabsList className="mb-4 border-gold/20 bg-orange-200/60 dark:bg-[#2d2a28]">
        {sortedCategories.map(category => (
          <TabsTrigger 
            key={category.id} 
            value={category.id}
            disabled={!documentsByCategory[category.id] || documentsByCategory[category.id].length === 0}
            className="relative text-navy dark:text-white"
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
      
      {sortedCategories.map(category => (
        <TabsContent key={category.id} value={category.id}>
          <CategoryDocumentTable 
            documents={documentsByCategory[category.id] || []}
            category={category}
            categoryColor={category.color}
            formatDate={formatDate}
            isDocumentExpired={isDocumentExpired}
            daysUntilExpiration={daysUntilExpiration}
            refreshDocuments={refreshDocuments}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
};
