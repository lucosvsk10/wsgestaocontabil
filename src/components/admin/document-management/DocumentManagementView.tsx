
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ClientSelector } from "./ClientSelector";
import { DocumentTable } from "./DocumentTable";
import { Button } from "@/components/ui/button";
import { ImprovedDocumentUpload } from "@/components/client/document-upload/ImprovedDocumentUpload";
import { useUserManagement } from "@/hooks/useUserManagement";
import { useDocumentManagement } from "@/hooks/useDocumentManagement";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export const DocumentManagementView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("upload");
  const { supabaseUsers, users, isLoadingUsers } = useUserManagement();
  const { 
    documents, 
    selectedUserId, 
    setSelectedUserId, 
    isLoadingDocuments,
    handleDeleteDocument 
  } = useDocumentManagement();
  
  // Find selected user details
  const selectedUser = supabaseUsers.find(user => user.id === selectedUserId);
  const userName = selectedUser?.user_metadata?.name || 'Usuário';
  const userEmail = selectedUser?.email || 'Sem email';
  
  if (isLoadingUsers) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }
  
  return (
    <Card className="border border-gray-200 dark:border-navy-lighter/30 bg-white dark:bg-navy-dark">
      <CardHeader className="border-b border-gray-200 dark:border-navy-lighter/30 bg-gray-50 dark:bg-navy-deeper">
        <div className="flex flex-col space-y-2 md:flex-row md:justify-between md:items-center">
          <CardTitle className="text-navy-dark dark:text-gold text-2xl font-museo">
            Gerenciamento de Documentos
          </CardTitle>
          
          <ClientSelector 
            users={supabaseUsers} 
            selectedUserId={selectedUserId} 
            setSelectedUserId={setSelectedUserId} 
          />
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {!selectedUserId ? (
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-gray-500 dark:text-gray-400">Selecione um cliente para gerenciar seus documentos</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 pt-6 border-b border-gray-200 dark:border-navy-lighter/30">
              <TabsList className="bg-gray-100 dark:bg-navy-light/30">
                <TabsTrigger 
                  value="upload" 
                  className="data-[state=active]:bg-navy-dark data-[state=active]:text-white dark:data-[state=active]:bg-gold dark:data-[state=active]:text-navy-dark"
                >
                  Upload
                </TabsTrigger>
                <TabsTrigger 
                  value="documents" 
                  className="data-[state=active]:bg-navy-dark data-[state=active]:text-white dark:data-[state=active]:bg-gold dark:data-[state=active]:text-navy-dark"
                >
                  Documentos
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="p-6">
              <TabsContent value="upload" className="mt-0">
                <TooltipProvider>
                  <ImprovedDocumentUpload userName={userName} userId={selectedUserId} />
                </TooltipProvider>
              </TabsContent>
              
              <TabsContent value="documents" className="mt-0">
                <DocumentTable 
                  documents={documents} 
                  isLoading={isLoadingDocuments} 
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
