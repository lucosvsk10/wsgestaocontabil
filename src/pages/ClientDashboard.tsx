
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Document } from "@/types/admin";
import { DocumentTabs } from "@/components/client/DocumentTabs";
import { EmptyDocuments } from "@/components/client/EmptyDocuments";
import {
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  getDocumentsByCategory
} from "@/utils/documentUtils";

// Categorias de documentos
const DOCUMENT_CATEGORIES = [
  "Impostos",
  "Documentações",
  "Certidões",
  "Folha de pagamentos"
];

const ClientDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', user.id)
          .order('uploaded_at', { ascending: false });
        
        if (error) throw error;
        
        // Guardar todos os documentos
        setAllDocuments(data || []);
        // Inicialmente, exibir todos os documentos
        setDocuments(data || []);
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
    
    fetchDocuments();
  }, [user, toast]);

  // Filtrar documentos por categoria
  useEffect(() => {
    if (selectedCategory) {
      setDocuments(allDocuments.filter(doc => doc.category === selectedCategory));
    } else {
      setDocuments(allDocuments);
    }
  }, [selectedCategory, allDocuments]);

  // Agrupar documentos por categoria
  const documentsByCategory = getDocumentsByCategory(allDocuments, DOCUMENT_CATEGORIES);

  return (
    <div className="min-h-screen flex flex-col bg-[#393532]">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8 bg-[_#2e2b28]">
        <Card className="py-0 bg-[#393532] mx-[10px]">
          <CardHeader className="rounded-full bg-[#393532]">
            <CardTitle className="text-[#e8cc81] font-medium uppercase tracking-wider text-xl my-0 text-center">
              MEUS DOCUMENTOS
            </CardTitle>
          </CardHeader>
          
          <CardContent className="rounded-3xl bg-[#393532]">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
              </div>
            ) : (
              <>
                {allDocuments.length > 0 ? (
                  <DocumentTabs
                    documents={documents}
                    allDocuments={allDocuments}
                    documentsByCategory={documentsByCategory}
                    categories={DOCUMENT_CATEGORIES}
                    setSelectedCategory={setSelectedCategory}
                    formatDate={formatDate}
                    isDocumentExpired={isDocumentExpired}
                    daysUntilExpiration={daysUntilExpiration}
                  />
                ) : (
                  <EmptyDocuments />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
      
      <Footer />
    </div>
  );
};

export default ClientDashboard;
