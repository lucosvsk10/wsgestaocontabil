
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentTabs } from "@/components/client/DocumentTabs";
import { EmptyDocuments } from "@/components/client/EmptyDocuments";
import { EmptyCategory } from "@/components/client/EmptyCategory";
import { Document } from "@/utils/auth/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { formatDate, isDocumentExpired, daysUntilExpiration, getDocumentsByCategory } from "@/utils/documentUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDocumentFetch } from "@/hooks/useDocumentFetch";

const ClientDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { documents, isLoadingDocuments, fetchUserDocuments } = useDocumentFetch();

  // Categorias de documentos
  const categories = ["Imposto de Renda", "Documentações", "Certidões"];

  // Obter documentos por categoria
  const documentsByCategory = getDocumentsByCategory(documents, categories);

  // Carregar documentos do usuário
  useEffect(() => {
    if (user?.id) {
      fetchUserDocuments(user.id);
    }
  }, [user, fetchUserDocuments]);

  // Encontrar a categoria com o documento mais recente
  useEffect(() => {
    if (documents.length > 0 && !isLoadingDocuments) {
      // Agrupar documentos por categoria
      const categoryDocuments: Record<string, Document[]> = {};
      
      categories.forEach(cat => {
        categoryDocuments[cat] = documents.filter(doc => doc.category === cat);
      });
      
      // Encontrar a categoria com o documento mais recente
      let mostRecentCategory: string | null = null;
      let mostRecentDate: Date | null = null;
      
      categories.forEach(cat => {
        const docsInCategory = categoryDocuments[cat];
        
        if (docsInCategory.length > 0) {
          // Encontrar documento mais recente na categoria
          const mostRecentDoc = docsInCategory.reduce((latest, doc) => {
            const docDate = new Date(doc.uploaded_at);
            const latestDate = new Date(latest.uploaded_at);
            return docDate > latestDate ? doc : latest;
          }, docsInCategory[0]);
          
          const docDate = new Date(mostRecentDoc.uploaded_at);
          
          // Verificar se é o mais recente de todas as categorias
          if (!mostRecentDate || docDate > mostRecentDate) {
            mostRecentDate = docDate;
            mostRecentCategory = cat;
          }
        }
      });
      
      // Selecionar a categoria com o documento mais recente
      if (mostRecentCategory) {
        setSelectedCategory(mostRecentCategory);
      } else if (categories.length > 0) {
        // Fallback: selecionar a primeira categoria se não houver documentos
        setSelectedCategory(categories[0]);
      }
    }
  }, [documents, isLoadingDocuments, categories]);

  return (
    <div className="min-h-screen flex flex-col bg-[#46413d]">
      <Navbar />
      <div className={`container mx-auto p-4 flex-grow ${isMobile ? 'px-2' : 'px-4'} py-6`}>
        <Card className="bg-[#393532] border-gold/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between font-extralight text-[#e8cc81] text-2xl">
              {selectedCategory ? `Documentos - ${selectedCategory}` : 'Meus Documentos'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingDocuments ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e8cc81]"></div>
              </div>
            ) : documents.length > 0 ? (
              selectedCategory ? (
                <div className={`${isMobile ? 'overflow-x-auto' : ''}`}>
                  <DocumentTabs 
                    documents={[]} // Unused prop now
                    allDocuments={documents} 
                    documentsByCategory={documentsByCategory} 
                    categories={categories} 
                    setSelectedCategory={setSelectedCategory} 
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
