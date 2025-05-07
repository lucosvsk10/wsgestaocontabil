
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentTabs } from "@/components/client/DocumentTabs";
import { EmptyDocuments } from "@/components/client/EmptyDocuments";
import { EmptyCategory } from "@/components/client/EmptyCategory";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { formatDate, isDocumentExpired, daysUntilExpiration, getDocumentsByCategory } from "@/utils/documentUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDocumentFetch } from "@/hooks/useDocumentFetch";
import { useDocumentRealtime } from "@/hooks/document/useDocumentRealtime";
import { useViewedDocumentsRealtime } from "@/hooks/document/useViewedDocumentsRealtime";

const ClientDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { documents, isLoadingDocuments, fetchUserDocuments } = useDocumentFetch();
  const hasInitializedRef = useRef(false);
  const userSelectedRef = useRef(false);
  
  // Add realtime hooks for notifications and viewed status updates
  useDocumentRealtime();
  useViewedDocumentsRealtime(() => {
    if (user?.id) {
      fetchUserDocuments(user.id);
    }
  });

  // Categories of documents
  const categories = ["Impostos", "Folha de Pagamento", "Documentações", "Certidões"];

  // Get documents by category
  const documentsByCategory = getDocumentsByCategory(documents, categories);

  // Load user documents
  useEffect(() => {
    if (user?.id) {
      fetchUserDocuments(user.id);
    }
  }, [user, fetchUserDocuments]);

  // Find the category with the most recent document - only on first render
  useEffect(() => {
    // Only execute when documents are loaded and not yet initialized
    if (!hasInitializedRef.current && !isLoadingDocuments) {
      // Only auto-select if the user hasn't manually selected yet
      if (!userSelectedRef.current) {
        let mostRecentCategory: string | null = null;
        
        if (documents.length > 0) {
          let mostRecentDate: Date | null = null;
          
          // Check all categories to find the most recent document
          categories.forEach(category => {
            const docsInCategory = documentsByCategory[category] || [];
            
            if (docsInCategory.length > 0) {
              // Sort documents by upload date (most recent first)
              const sortedDocs = [...docsInCategory].sort(
                (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
              );
              
              const mostRecentInCategory = sortedDocs[0];
              const docDate = new Date(mostRecentInCategory.uploaded_at);
              
              // Check if this is the most recent across all categories
              if (!mostRecentDate || docDate > mostRecentDate) {
                mostRecentDate = docDate;
                mostRecentCategory = category;
              }
            }
          });
        }
        
        // Select the category with the most recent document or first one with documents
        if (mostRecentCategory) {
          setSelectedCategory(mostRecentCategory);
        } else if (categories.some(cat => documentsByCategory[cat]?.length > 0)) {
          // Fallback: select first category that has documents
          const firstCategoryWithDocs = categories.find(cat => documentsByCategory[cat]?.length > 0);
          setSelectedCategory(firstCategoryWithDocs || categories[0]);
        } else {
          // Final fallback: first available category
          setSelectedCategory(categories[0]);
        }
      }
      
      // Mark as initialized to avoid future runs
      hasInitializedRef.current = true;
    }
  }, [documents, isLoadingDocuments, categories, documentsByCategory]);

  // Function to change the selected category (for use in DocumentTabs)
  const handleCategoryChange = (newCategory: string | null) => {
    if (newCategory) {
      setSelectedCategory(newCategory);
      // Mark that the user made a manual selection
      userSelectedRef.current = true;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-orange-100 dark:bg-navy-dark">
      <Navbar />
      <div className={`container mx-auto p-4 flex-grow ${isMobile ? 'px-2' : 'px-4'} py-6`}>
        <Card className="bg-white dark:bg-[#2d2a28] border-gold/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between font-extralight text-gold text-2xl">
              {selectedCategory ? `Documentos - ${selectedCategory}` : 'Meus Documentos'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingDocuments ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
              </div>
            ) : documents.length > 0 ? (
              selectedCategory ? (
                <div className={`${isMobile ? 'overflow-x-auto' : ''}`}>
                  <DocumentTabs 
                    documents={[]} 
                    allDocuments={documents} 
                    documentsByCategory={documentsByCategory} 
                    categories={categories} 
                    setSelectedCategory={handleCategoryChange} 
                    formatDate={formatDate} 
                    isDocumentExpired={isDocumentExpired} 
                    daysUntilExpiration={daysUntilExpiration} 
                    refreshDocuments={() => fetchUserDocuments(user?.id || '')}
                    activeCategory={selectedCategory}
                  />
                </div>
              ) : (
                <EmptyCategory />
              )
            ) : (
              <EmptyDocuments />
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default ClientDashboard;
