
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentTabs } from "@/components/client/DocumentTabs";
import { EmptyDocuments } from "@/components/client/EmptyDocuments";
import { EmptyCategory } from "@/components/client/EmptyCategory";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { formatDate, isDocumentExpired, daysUntilExpiration } from "@/utils/documentUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDocumentFetch } from "@/hooks/useDocumentFetch";
import { NotificationsButton } from "@/components/client/NotificationsButton";
import { organizeDocuments } from "@/utils/documents/documentOrganizer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useDocumentNotifications } from "@/hooks/useDocumentNotifications";
import { NotificationBell } from "@/components/notifications/NotificationBell";

const ClientDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { documents, isLoadingDocuments, error, fetchUserDocuments } = useDocumentFetch();
  const hasInitializedRef = useRef(false);
  const userSelectedRef = useRef(false);
  
  // Document categories
  const categories = ["Impostos", "Folha de Pagamento", "Documentações", "Certidões"];

  // Get documents by category with prioritization
  const documentsByCategory = organizeDocuments(documents, categories);
  
  // Initialize document notifications
  const { fetchUnreadDocuments, getTotalUnreadCount } = useDocumentNotifications(() => {
    if (user?.id) {
      fetchUserDocuments(user.id);
    }
  });
  
  // Function to refresh documents
  const handleRefreshDocuments = () => {
    if (user?.id) {
      fetchUserDocuments(user.id);
      fetchUnreadDocuments();
    }
  };

  // Load user documents when user changes
  useEffect(() => {
    if (user?.id) {
      console.log("User ID disponível, buscando documentos:", user.id);
      fetchUserDocuments(user.id);
      fetchUnreadDocuments();
    } else {
      console.log("User ID não disponível, não é possível buscar documentos");
    }
  }, [user?.id]);
  
  // Find category with most recent document - only on first render
  useEffect(() => {
    // Only execute when documents are loaded and not yet initialized
    if (!hasInitializedRef.current && !isLoadingDocuments && documents.length > 0) {
      console.log("Inicializando seleção de categoria baseada em documentos");
      // Only do automatic selection if user hasn't made manual selection
      if (!userSelectedRef.current) {
        let mostRecentCategory: string | null = null;
        
        if (documents.length > 0) {
          let mostRecentDate: Date | null = null;
          
          // Search all categories to find most recent document
          categories.forEach(category => {
            const docsInCategory = documentsByCategory[category] || [];
            
            if (docsInCategory.length > 0) {
              // Sort documents by upload date (most recent first)
              const sortedDocs = [...docsInCategory].sort(
                (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
              );
              
              const mostRecentInCategory = sortedDocs[0];
              const docDate = new Date(mostRecentInCategory.uploaded_at);
              
              // Check if it's the most recent of all categories
              if (!mostRecentDate || docDate > mostRecentDate) {
                mostRecentDate = docDate;
                mostRecentCategory = category;
              }
            }
          });
        }
        
        // Select category with most recent document or first with documents
        if (mostRecentCategory) {
          setSelectedCategory(mostRecentCategory);
        } else if (categories.some(cat => documentsByCategory[cat]?.length > 0)) {
          // Fallback: select first category with documents
          const firstCategoryWithDocs = categories.find(cat => documentsByCategory[cat]?.length > 0);
          setSelectedCategory(firstCategoryWithDocs || categories[0]);
        } else {
          // Final fallback: first available category
          setSelectedCategory(categories[0]);
        }
      }
      
      // Mark as initialized to prevent future executions
      hasInitializedRef.current = true;
    }
  }, [documents, isLoadingDocuments, categories, documentsByCategory]);

  // Function to change selected category (for use in DocumentTabs)
  const handleCategoryChange = (newCategory: string | null) => {
    if (newCategory) {
      setSelectedCategory(newCategory);
      // Mark that user made a manual selection
      userSelectedRef.current = true;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-orange-200 dark:bg-navy-dark">
      <Navbar />
      <div className={`container mx-auto p-4 flex-grow ${isMobile ? 'px-2' : 'px-4'} py-6`}>
        <Card className="bg-white dark:bg-[#393532] border-gold/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-extralight text-gold text-2xl">
              {selectedCategory ? `Documentos - ${selectedCategory}` : 'Meus Documentos'}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefreshDocuments}
                title="Atualizar documentos"
                className="hover:bg-gold/20"
              >
                <RefreshCcw size={18} className="text-gold" />
              </Button>
              <NotificationBell />
              <NotificationsButton />
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingDocuments ? (
              <LoadingSpinner size="lg" />
            ) : error ? (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-5 w-5 mr-2" />
                <AlertTitle>Erro ao carregar documentos</AlertTitle>
                <AlertDescription className="flex flex-col gap-2">
                  <p>{error}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRefreshDocuments}
                    className="flex items-center gap-2 self-end"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Tentar novamente
                  </Button>
                </AlertDescription>
              </Alert>
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
                    refreshDocuments={handleRefreshDocuments}
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
