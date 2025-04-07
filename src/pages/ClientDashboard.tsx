
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentTabs } from "@/components/client/DocumentTabs";
import { EmptyDocuments } from "@/components/client/EmptyDocuments";
import { Document } from "@/types/admin";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  formatDate, 
  isDocumentExpired, 
  daysUntilExpiration,
  getDocumentsByCategory 
} from "@/utils/documentUtils";

const ClientDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Categorias de documentos
  const categories = ["Imposto de Renda", "Documentações", "Certidões"];
  
  // Filtrar documentos por categoria selecionada
  const filteredDocuments = selectedCategory
    ? documents.filter(doc => doc.category === selectedCategory)
    : documents;
  
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
    <div className="container mx-auto p-4 max-w-7xl">
      <h1 className="text-2xl font-bold mb-6 text-[#e8cc81]">Meus Documentos</h1>
      
      <Card className="bg-[#393532]">
        <CardHeader>
          <CardTitle className="text-[#e8cc81]">Documentos Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
            </div>
          ) : documents.length > 0 ? (
            <DocumentTabs 
              documents={filteredDocuments}
              allDocuments={documents}
              documentsByCategory={documentsByCategory}
              categories={categories}
              setSelectedCategory={setSelectedCategory}
              formatDate={formatDate}
              isDocumentExpired={isDocumentExpired}
              daysUntilExpiration={daysUntilExpiration}
              refreshDocuments={fetchUserDocuments}
            />
          ) : (
            <EmptyDocuments />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDashboard;
