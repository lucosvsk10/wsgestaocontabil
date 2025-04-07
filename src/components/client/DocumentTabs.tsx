
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Document } from "@/types/admin";
import { DocumentTable } from "./DocumentTable";
import { CategoryDocumentTable } from "./CategoryDocumentTable";
import { useIsMobile } from "@/hooks/use-mobile";

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
  documents,
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
  
  // Count new documents per category
  const newDocumentCounts = categories.reduce((acc, category) => {
    acc[category] = documentsByCategory[category].filter(doc => !doc.viewed).length;
    return acc;
  }, {} as Record<string, number>);

  // Total new documents
  const totalNewDocuments = allDocuments.filter(doc => !doc.viewed).length;

  return (
    <Tabs defaultValue="all" className="w-full">
      <TabsList className={`mb-4 border-gold/20 bg-[#46413d] ${isMobile ? 'flex flex-wrap' : ''}`}>
        <TabsTrigger 
          value="all" 
          onClick={() => setSelectedCategory(null)} 
          className="relative text-white data-[state=active]:bg-gold data-[state=active]:text-navy"
        >
          Todos
          {totalNewDocuments > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {totalNewDocuments}
            </span>
          )}
        </TabsTrigger>
        {categories.map(category => (
          <TabsTrigger 
            key={category} 
            value={category}
            onClick={() => setSelectedCategory(category)}
            disabled={documentsByCategory[category].length === 0}
            className="relative text-white data-[state=active]:bg-gold data-[state=active]:text-navy"
          >
            {category}
            {newDocumentCounts[category] > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {newDocumentCounts[category]}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      
      <TabsContent value="all">
        <DocumentTable 
          documents={documents}
          formatDate={formatDate}
          isDocumentExpired={isDocumentExpired}
          daysUntilExpiration={daysUntilExpiration}
          refreshDocuments={refreshDocuments}
        />
      </TabsContent>
      
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
