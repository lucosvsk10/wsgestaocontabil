
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
import { Menu, BellDot, Check } from "lucide-react";
import { useDocumentNotifications } from "@/hooks/useDocumentNotifications";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const { getUnreadCountByCategory, markAllCategoryAsRead } = useDocumentNotifications(refreshDocuments);
  
  // Handle marking all documents in a category as read
  const handleMarkCategoryAsRead = async (category: string) => {
    try {
      await markAllCategoryAsRead(category);
      refreshDocuments();
    } catch (error) {
      console.error("Error marking category as read:", error);
    }
  };
  
  // Check if active category has documents, if not select another
  useEffect(() => {
    if (activeCategory && documentsByCategory[activeCategory]?.length === 0) {
      console.log("Categoria ativa vazia:", activeCategory);
      // Find first category with documents
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
            {getUnreadCountByCategory(activeCategory) > 0 && (
              <div className="flex items-center">
                <BellDot size={16} className="text-blue-400 mr-1" />
                <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full">
                  {getUnreadCountByCategory(activeCategory)}
                </span>
              </div>
            )}
          </Button>
        </DrawerTrigger>
        <DrawerContent className="bg-[#393532] dark:bg-[#2d2a28] border-t border-gold/20 p-4">
          <div className="max-w-md mx-auto">
            <div className="space-y-2">
              {categories.map((category) => {
                const unreadCount = getUnreadCountByCategory(category);
                
                return (
                  <div 
                    key={category}
                    className="relative"
                  >
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="document"
                        className={`flex-1 justify-between ${
                          documentsByCategory[category]?.length > 0 
                            ? "text-white" 
                            : "text-gray-400"
                        }`}
                        disabled={!documentsByCategory[category] || documentsByCategory[category].length === 0}
                        onClick={() => handleCategoryChange(category)}
                      >
                        <span>{category}</span>
                        <div className="flex items-center">
                          {unreadCount > 0 && <BellDot size={16} className="text-blue-400 mr-1" />}
                          {documentsByCategory[category]?.length > 0 && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              unreadCount > 0 
                                ? "bg-blue-500 text-white" 
                                : "bg-gold text-navy"
                            }`}>
                              {documentsByCategory[category].length}
                            </span>
                          )}
                        </div>
                      </Button>
                      
                      {unreadCount > 0 && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 text-green-400"
                          onClick={() => handleMarkCategoryAsRead(category)}
                          title="Marcar todos como lidos"
                        >
                          <Check size={16} />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
      
      {categories.map((category) => (
        <div key={category} className={category === activeCategory ? 'block' : 'hidden'}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gold">{category}</h3>
            {getUnreadCountByCategory(category) > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMarkCategoryAsRead(category)}
                className="text-xs border-gold/20 text-gold hover:bg-gold/20"
              >
                <Check size={14} className="mr-1" />
                Marcar todos como lidos
              </Button>
            )}
          </div>
          
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
      <div className="flex items-center justify-between mb-4">
        <TabsList className="border-gold/20 bg-[#46413d] dark:bg-[#2d2a28]">
          {categories.map(category => {
            const unreadCount = getUnreadCountByCategory(category);
            
            return (
              <TabsTrigger 
                key={category} 
                value={category}
                disabled={!documentsByCategory[category] || documentsByCategory[category].length === 0}
                className="relative text-white data-[state=active]:bg-gold data-[state=active]:text-navy"
              >
                <div className="flex items-center">
                  {category}
                  {unreadCount > 0 && <BellDot size={16} className="text-blue-400 ml-1" />}
                </div>
                {documentsByCategory[category]?.length > 0 && (
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                    unreadCount > 0 
                      ? "bg-blue-500 text-white" 
                      : "bg-navy dark:bg-gold text-white dark:text-navy"
                  }`}>
                    {documentsByCategory[category].length}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
        
        {getUnreadCountByCategory(activeCategory) > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMarkCategoryAsRead(activeCategory)}
            className="text-xs border-gold/20 text-gold hover:bg-gold/20"
          >
            <Check size={14} className="mr-1" />
            Marcar todos como lidos
          </Button>
        )}
      </div>
      
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
