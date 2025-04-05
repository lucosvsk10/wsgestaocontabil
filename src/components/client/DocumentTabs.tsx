
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Document } from "@/types/admin";
import { DocumentTable } from "./DocumentTable";
import { CategoryDocumentTable } from "./CategoryDocumentTable";

interface DocumentTabsProps {
  documents: Document[];
  allDocuments: Document[];
  documentsByCategory: Record<string, Document[]>;
  categories: string[];
  setSelectedCategory: (category: string | null) => void;
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expiresAt: string | null) => boolean;
  daysUntilExpiration: (expiresAt: string | null) => string | null;
}

export const DocumentTabs = ({
  documents,
  allDocuments,
  documentsByCategory,
  categories,
  setSelectedCategory,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration
}: DocumentTabsProps) => {
  return (
    <Tabs defaultValue="all">
      <TabsList className="mb-4">
        <TabsTrigger value="all" onClick={() => setSelectedCategory(null)}>
          Todos
        </TabsTrigger>
        {categories.map(category => (
          <TabsTrigger 
            key={category} 
            value={category}
            onClick={() => setSelectedCategory(category)}
            disabled={documentsByCategory[category].length === 0}
          >
            {category}
          </TabsTrigger>
        ))}
      </TabsList>
      
      <TabsContent value="all">
        <DocumentTable 
          documents={documents}
          formatDate={formatDate}
          isDocumentExpired={isDocumentExpired}
          daysUntilExpiration={daysUntilExpiration}
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
          />
        </TabsContent>
      ))}
    </Tabs>
  );
};
