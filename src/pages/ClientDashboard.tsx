import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDocumentFetch } from '@/hooks/document/useDocumentFetch';
import { useDocumentRealtime } from '@/hooks/document/useDocumentRealtime';
import { useViewedDocumentNotifier } from '@/hooks/document/useViewedDocumentNotifier';
import { useDocumentActions } from '@/hooks/document/useDocumentActions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { DocumentTable } from '@/components/client/DocumentTable';
import { format, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppDocument } from '@/types/admin';
import { useIsMobile } from '@/hooks/use-mobile';
import { CategoryDocumentTable } from '@/components/client/document-table/CategoryDocumentTable';

const ClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("documentos");
  const [categories, setCategories] = useState<string[]>([]);
  const { documents, fetchUserDocuments } = useDocumentFetch();
  const { loadingDocumentIds, handleDownload, markDocumentAsViewed } = useDocumentActions();
  const { markDocumentAsViewed: notifyDocumentViewed } = useViewedDocumentNotifier();

  // Configurar atualização em tempo real para documentos
  useDocumentRealtime({
    userId: user?.id || null,
    onDocumentChange: () => {
      if (user) {
        fetchUserDocuments(user.id);
      }
    }
  });

  useEffect(() => {
    const fetchDocuments = async () => {
      if (user) {
        await fetchUserDocuments(user.id);
      }
    };

    fetchDocuments();

    // Extrair categorias únicas dos documentos
    if (documents.length > 0) {
      const uniqueCategories = Array.from(
        new Set(documents.map(doc => {
          // Extrair categoria principal (antes da barra, se houver)
          const category = doc.category?.split('/')[0];
          return category || 'Sem categoria';
        }))
      );
      setCategories(uniqueCategories);
    }
  }, [user, fetchUserDocuments, documents.length]);

  // Formatar data para exibição
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (e) {
      return "Data inválida";
    }
  };

  // Verificar se o documento está expirado
  const isDocumentExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    const expirationDate = new Date(expiresAt);
    return isAfter(new Date(), expirationDate);
  };

  // Calcular dias restantes até a expiração
  const daysUntilExpiration = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const expirationDate = new Date(expiresAt);
    const today = new Date();
    const diffTime = expirationDate.getTime() - today.getTime();
    if (diffTime <= 0) return 'Expirado';
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} dias`;
  };

  // Agrupar documentos por categoria
  const getDocumentsByCategory = (category: string) => {
    return documents.filter(doc => {
      const docCategory = doc.category?.split('/')[0] || 'Sem categoria';
      return docCategory === category;
    });
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    if (value === "documentos" && user) {
      fetchUserDocuments(user.id);
    }
  };

  // Marcar documento como visualizado quando aberto
  const handleDocumentView = async (documentId: string) => {
    if (user) {
      await markDocumentAsViewed(documentId, user.id);
      await notifyDocumentViewed(documentId, user.id);
      // Atualizar a lista de documentos
      fetchUserDocuments(user.id);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy dark:text-gold">Painel do Cliente</h1>
      
      <Tabs defaultValue={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-6">
          <TabsTrigger value="documentos">Meus Documentos</TabsTrigger>
          <TabsTrigger value="perfil">Meu Perfil</TabsTrigger>
        </TabsList>
        
        <TabsContent value="documentos">
          <Card>
            <CardContent className="pt-6">
              {documents.length > 0 ? (
                <>
                  {categories.length > 0 && !isMobile ? (
                    // Visualização por categorias (desktop)
                    <div className="space-y-8">
                      {categories.map(category => {
                        const categoryDocuments = getDocumentsByCategory(category);
                        if (categoryDocuments.length === 0) return null;
                        
                        return (
                          <CategoryDocumentTable
                            key={category}
                            category={category}
                            documents={categoryDocuments}
                            formatDate={formatDate}
                            isDocumentExpired={isDocumentExpired}
                            daysUntilExpiration={daysUntilExpiration}
                            refreshDocuments={() => user && fetchUserDocuments(user.id)}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    // Visualização padrão (todos documentos)
                    <DocumentTable
                      documents={documents}
                      formatDate={formatDate}
                      isDocumentExpired={isDocumentExpired}
                      daysUntilExpiration={daysUntilExpiration}
                      refreshDocuments={() => user && fetchUserDocuments(user.id)}
                    />
                  )}
                </>
              ) : (
                <div className="text-center py-10">
                  <p className="text-lg text-gray-600 dark:text-gray-300">
                    Você não possui documentos disponíveis no momento.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="perfil">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4 text-navy dark:text-gold">Informações Pessoais</h2>
              {user && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Nome</p>
                    <p className="font-medium">{user.user_metadata?.name || user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientDashboard;
