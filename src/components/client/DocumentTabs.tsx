
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Document } from "@/types/admin";
import { CategoryDocumentTable } from "./document-table";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";
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
  categories: string[];
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
  
  // Verificar se a categoria ativa tem documentos, senão selecionar outra
  useEffect(() => {
    if (activeCategory && documentsByCategory[activeCategory]?.length === 0) {
      console.log("Categoria ativa vazia:", activeCategory);
      // Encontrar a primeira categoria com documentos
      const firstNonEmptyCategory = categories.find(cat => 
        documentsByCategory[cat] && documentsByCategory[cat].length > 0
      );
      
      if (firstNonEmptyCategory && firstNonEmptyCategory !== activeCategory) {
        console.log("Mudando para categoria com documentos:", firstNonEmptyCategory);
        setSelectedCategory(firstNonEmptyCategory);
      }
    }
  }, [activeCategory, documentsByCategory, categories, setSelectedCategory]);
  
  const handleCategoryChange = (category: string) => {
    console.log("Mudando para categoria:", category);
    setSelectedCategory(category);
    setIsDrawerOpen(false);
  };

  return isMobile ? (
    <div className="w-full">
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerTrigger asChild>
          <Button 
            variant="document" 
            className="w-full mb-4 justify-between font-medium text-white border-gold/20"
          >
            <div className="flex items-center">
              <Menu className="mr-2 h-4 w-4" />
              <span>{activeCategory}</span>
            </div>
          </Button>
        </DrawerTrigger>
        <DrawerContent className="bg-[#393532] dark:bg-[#2d2a28] border-t border-gold/20 p-4">
          <div className="max-w-md mx-auto">
            <div className="space-y-2">
              {categories.map((category) => (
                <div 
                  key={category}
                  className="relative"
                >
                  <Button 
                    variant="document"
                    className={`w-full justify-between ${
                      documentsByCategory[category]?.length > 0 
                        ? "text-white" 
                        : "text-gray-400"
                    }`}
                    disabled={!documentsByCategory[category] || documentsByCategory[category].length === 0}
                    onClick={() => handleCategoryChange(category)}
                  >
                    <span>{category}</span>
                    {documentsByCategory[category]?.length > 0 && (
                      <span className="text-xs bg-gold text-navy px-2 py-0.5 rounded-full">
                        {documentsByCategory[category].length}
                      </span>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
      
      {categories.map((category) => (
        <div key={category} className={category === activeCategory ? 'block' : 'hidden'}>
          <CategoryDocumentTable 
            documents={documentsByCategory[category] || []}
            category={category}
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
      <TabsList className="mb-4 border-gold/20 bg-[#46413d] dark:bg-[#2d2a28]">
        {categories.map(category => (
          <TabsTrigger 
            key={category} 
            value={category}
            disabled={!documentsByCategory[category] || documentsByCategory[category].length === 0}
            className="relative text-white data-[state=active]:bg-gold data-[state=active]:text-navy"
          >
            {category}
            {documentsByCategory[category]?.length > 0 && (
              <span className="ml-2 text-xs bg-navy dark:bg-gold text-white dark:text-navy px-1.5 py-0.5 rounded-full">
                {documentsByCategory[category].length}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      
      {categories.map(category => (
        <TabsContent key={category} value={category}>
          <CategoryDocumentTable 
            documents={documentsByCategory[category] || []}
            category={category}
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
