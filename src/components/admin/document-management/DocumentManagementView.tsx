
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ClientSelector } from "./ClientSelector";
import { DocumentTable } from "./DocumentTable";
import { Button } from "@/components/ui/button";
import { ImprovedDocumentUpload } from "@/components/client/document-upload/ImprovedDocumentUpload";
import { useUserManagement } from "@/hooks/useUserManagement";
import { useDocumentManagement } from "@/hooks/document-management/useDocumentManagement";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const DocumentManagementView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("upload");
  const navigate = useNavigate();
  const { supabaseUsers, users, isLoadingUsers } = useUserManagement();
  const { 
    documents, 
    selectedUserId, 
    setSelectedUserId, 
    isLoadingDocuments,
    loadingDocumentIds,
    handleDownload,
    handleDeleteDocument 
  } = useDocumentManagement(users, supabaseUsers);
  
  // Find selected user details
  const selectedUser = supabaseUsers.find(user => user.id === selectedUserId);
  const userName = selectedUser?.user_metadata?.name || 'Usuário';
  const userEmail = selectedUser?.email || 'Sem email';

  const handleBackToUserList = () => {
    navigate("/admin/users");
  };
  
  if (isLoadingUsers) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }
  
  return (
    <Card className="border border-gray-200 dark:border-navy-lighter/30 bg-white dark:bg-navy-dark shadow-lg rounded-lg overflow-hidden">
      <CardHeader className="border-b border-gray-200 dark:border-navy-lighter/30 bg-gray-50 dark:bg-navy-deeper p-6">
        <div className="flex items-center mb-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleBackToUserList} 
            className="mr-2 bg-white dark:bg-navy-light/30 border-gold/20 dark:text-gold hover:bg-gold/10 dark:hover:bg-gold/20 hover:text-navy dark:hover:text-navy flex items-center gap-1"
          >
            <ArrowLeft size={16} />
            Voltar para lista de clientes
          </Button>
        </div>

        <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:justify-between md:items-end">
          <div className="flex-1">
            <CardTitle className="text-navy-dark dark:text-gold text-2xl font-museo mb-4">
              Gerenciamento de Documentos
            </CardTitle>
            {selectedUserId && (
              <div className="p-4 bg-navy/5 dark:bg-gold/10 rounded-lg border border-navy/10 dark:border-gold/20 flex flex-col">
                <h3 className="font-bold text-lg text-navy-dark dark:text-gold mb-1">{userName}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">{userEmail}</p>
              </div>
            )}
          </div>
          
          <ClientSelector 
            users={users}
            supabaseUsers={supabaseUsers} 
            selectedUserId={selectedUserId} 
            onSelectUser={setSelectedUserId} 
          />
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {!selectedUserId ? (
          <div className="flex flex-col items-center justify-center h-64 p-6">
            <p className="text-gray-500 dark:text-gray-400 text-center">
              Selecione um cliente para gerenciar seus documentos
            </p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 pt-6 border-b border-gray-200 dark:border-navy-lighter/30">
              <TabsList className="bg-gray-100 dark:bg-navy-light/30">
                <TabsTrigger 
                  value="upload" 
                  className="data-[state=active]:bg-navy-dark data-[state=active]:text-white dark:data-[state=active]:bg-gold dark:data-[state=active]:text-navy-dark"
                >
                  Upload de Documentos
                </TabsTrigger>
                <TabsTrigger 
                  value="documents" 
                  className="data-[state=active]:bg-navy-dark data-[state=active]:text-white dark:data-[state=active]:bg-gold dark:data-[state=active]:text-navy-dark"
                >
                  Gerenciar Documentos
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="p-6">
              <TabsContent value="upload" className="mt-0">
                <TooltipProvider>
                  <ImprovedDocumentUpload 
                    userName={userName} 
                    userId={selectedUserId}
                    documentCategories={["Imposto de Renda", "Documentações", "Certidões", "Contratos", "Notas Fiscais", "Impostos"]}
                    multipleFiles={true} 
                  />
                </TooltipProvider>
              </TabsContent>
              
              <TabsContent value="documents" className="mt-0">
                <DocumentTable 
                  documents={documents} 
                  isLoading={isLoadingDocuments}
                  loadingDocumentIds={loadingDocumentIds}
                  onDownload={handleDownload}
                  onDelete={handleDeleteDocument} 
                />
              </TabsContent>
            </div>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
