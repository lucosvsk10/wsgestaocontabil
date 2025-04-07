
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
import { 
  formatDate, 
  isDocumentExpired, 
  daysUntilExpiration,
  getDocumentsByCategory 
} from "@/utils/documentUtils";
import { useIsMobile } from "@/hooks/use-mobile";

const ClientDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const isMobile = useIsMobile();
  
  // Categorias de documentos
  const categories = ["Imposto de Renda", "Documentações", "Certidões"];
  
  // Obter documentos por categoria
  const documentsByCategory = getDocumentsByCategory(documents, categories);
  
  // Carregar documentos do usuário
  useEffect(() => {
    if (user?.id) {
      fetchUserDocuments();
    }
  }, [user]);
  
  const fetchUserDocuments = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });
        
      if (error) throw error;
      
      setDocuments(data || []);
      
      // Set default selected category if we have documents
      if ((data || []).length > 0 && !selectedCategory) {
        // Find first category that has documents
        const firstCategoryWithDocs = categories.find(
          cat => (data || []).some(doc => doc.category === cat)
        );
        
        if (firstCategoryWithDocs) {
          setSelectedCategory(firstCategoryWithDocs);
        }
      }
    } catch (error: any) {
      console.error('Erro ao carregar documentos:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar documentos",
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#46413d]">
      <Navbar />
      <div className={`container mx-auto p-4 flex-grow ${isMobile ? 'px-2' : 'px-4'} py-6`}>
        <h1 className="text-2xl font-bold mb-6 text-[#e8cc81]">Meus Documentos</h1>
        
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-3 gap-4'} mb-6`}>
          {categories.map(category => {
            const categoryDocs = documentsByCategory[category] || [];
            const unviewedCount = categoryDocs.filter(doc => !doc.viewed).length;
            
            return (
              <Card 
                key={category} 
                className={`cursor-pointer hover:shadow-md transition-shadow ${
                  selectedCategory === category ? 'border-[#e8cc81] border-2' : 'bg-[#393532] border-gold/20'
                }`}
                onClick={() => setSelectedCategory(category)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-[#e8cc81] flex items-center justify-between">
                    {category}
                    {unviewedCount > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {unviewedCount}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-300">
                    {categoryDocs.length} documento{categoryDocs.length !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        <Card className="bg-[#393532] border-gold/20">
          <CardHeader>
            <CardTitle className="text-[#e8cc81] flex items-center justify-between">
              {selectedCategory ? `Documentos - ${selectedCategory}` : 'Meus Documentos'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
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
                    refreshDocuments={fetchUserDocuments}
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
