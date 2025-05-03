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

const ClientDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { documents, isLoadingDocuments, fetchUserDocuments } = useDocumentFetch();
  const hasInitializedRef = useRef(false);
  const userSelectedRef = useRef(false);

  // Categorias de documentos atualizadas
  const categories = ["Impostos", "Folha de Pagamento", "Documentações", "Certidões"];

  // Obter documentos por categoria
  const documentsByCategory = getDocumentsByCategory(documents, categories);

  // Carregar documentos do usuário
  useEffect(() => {
    if (user?.id) {
      fetchUserDocuments(user.id);
    }
  }, [user, fetchUserDocuments]);

  // Encontrar a categoria com o documento mais recente - apenas na primeira renderização
  useEffect(() => {
    // Garante que só execute quando os documentos estiverem carregados e ainda não inicializado
    if (!hasInitializedRef.current && !isLoadingDocuments) {
      // Apenas faça a seleção automática se o usuário ainda não fez uma seleção manual
      if (!userSelectedRef.current) {
        let mostRecentCategory: string | null = null;
        
        if (documents.length > 0) {
          let mostRecentDate: Date | null = null;
          
          // Percorrer todas as categorias para encontrar o documento mais recente
          categories.forEach(category => {
            const docsInCategory = documentsByCategory[category] || [];
            
            if (docsInCategory.length > 0) {
              // Ordenar documentos por data de upload (mais recente primeiro)
              const sortedDocs = [...docsInCategory].sort(
                (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
              );
              
              const mostRecentInCategory = sortedDocs[0];
              const docDate = new Date(mostRecentInCategory.uploaded_at);
              
              // Verificar se é o mais recente de todas as categorias
              if (!mostRecentDate || docDate > mostRecentDate) {
                mostRecentDate = docDate;
                mostRecentCategory = category;
              }
            }
          });
        }
        
        // Selecionar a categoria com o documento mais recente ou a primeira com documentos
        if (mostRecentCategory) {
          setSelectedCategory(mostRecentCategory);
        } else if (categories.some(cat => documentsByCategory[cat]?.length > 0)) {
          // Fallback: selecionar a primeira categoria que tenha documentos
          const firstCategoryWithDocs = categories.find(cat => documentsByCategory[cat]?.length > 0);
          setSelectedCategory(firstCategoryWithDocs || categories[0]);
        } else {
          // Fallback final: primeira categoria disponível
          setSelectedCategory(categories[0]);
        }
      }
      
      // Marcar como inicializado para evitar execuções futuras
      hasInitializedRef.current = true;
    }
  }, [documents, isLoadingDocuments, categories, documentsByCategory]);

  // Função para alterar a categoria selecionada (para uso no DocumentTabs)
  const handleCategoryChange = (newCategory: string | null) => {
    if (newCategory) {
      setSelectedCategory(newCategory);
      // Marca que o usuário fez uma seleção manual
      userSelectedRef.current = true;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-orange-200 dark:bg-navy-dark">
      <Navbar />
      <div className={`container mx-auto p-4 flex-grow ${isMobile ? 'px-2' : 'px-4'} py-6`}>
        <Card className="bg-white dark:bg-[#393532] border-gold/20">
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
