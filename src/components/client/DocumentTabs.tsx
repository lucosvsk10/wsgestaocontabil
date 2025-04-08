
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Document } from "@/types/admin";
import { CategoryDocumentTable } from "./document-table";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect, useState } from "react";
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
}

export const DocumentTabs = ({
  allDocuments,
  documentsByCategory,
  categories,
  setSelectedCategory,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  refreshDocuments
}: DocumentTabsProps) => {
  const isMobile = useIsMobile();
  const [activeCategory, setActiveCategory] = useState<string>(categories[0] || "");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Handler for changing the active category
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
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
        <DrawerContent className="bg-[#393532] border-t border-gold/20 p-4">
          <div className="max-w-md mx-auto">
            <div className="space-y-2">
              {categories.map((category) => (
                <div 
                  key={category}
                  className="relative"
                >
                  <Button 
                    variant="document"
                    className="w-full justify-between text-white"
                    disabled={documentsByCategory[category].length === 0}
                    onClick={() => handleCategoryChange(category)}
                  >
                    <span>{category}</span>
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
            documents={documentsByCategory[category]}
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
    <Tabs defaultValue={categories[0] || ""} className="w-full">
      <TabsList className="mb-4 border-gold/20 bg-[#46413d]">
        {categories.map(category => (
          <TabsTrigger 
            key={category} 
            value={category}
            onClick={() => setSelectedCategory(category)}
            disabled={documentsByCategory[category].length === 0}
            className="relative text-white data-[state=active]:bg-gold data-[state=active]:text-navy"
          >
            {category}
          </TabsTrigger>
        ))}
      </TabsList>
      
      {categories.map(category => (
        <TabsContent key={category} value={category}>
          <CategoryDocumentTable 
            documents={documentsByCategory[category]}
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
