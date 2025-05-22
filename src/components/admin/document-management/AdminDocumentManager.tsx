import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Document } from "@/types/admin";
import { AdminDocumentUpload } from "./AdminDocumentUpload";
import { AdminDocumentTable } from "./AdminDocumentTable";
import { UserInfo } from "./UserInfo";
import { useDocumentCategories } from "@/hooks/document-management/useDocumentCategories";
interface AdminDocumentManagerProps {
  userId: string;
  userName: string;
  userEmail: string;
  documents: Document[];
  isLoadingDocuments: boolean;
  loadingDocumentIds: Set<string>;
  handleDownload: (document: Document) => Promise<void>;
  handleDeleteDocument: (documentId: string) => Promise<void>;
}
export const AdminDocumentManager: React.FC<AdminDocumentManagerProps> = ({
  userId,
  userName,
  userEmail,
  documents,
  isLoadingDocuments,
  loadingDocumentIds,
  handleDownload,
  handleDeleteDocument
}) => {
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc"); // Default newest first
  const {
    categories
  } = useDocumentCategories();
  const sortedDocuments = [...documents].sort((a, b) => {
    const dateA = new Date(a.uploaded_at).getTime();
    const dateB = new Date(b.uploaded_at).getTime();
    return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
  });
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "desc" ? "asc" : "desc");
  };
  const handleDocumentUploaded = () => {
    // Muda para a aba de documentos após o upload
    setActiveTab("documents");
  };
  return <div className="space-y-6">
      <UserInfo userName={userName} userEmail={userEmail} />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b border-gray-200 dark:border-navy-lighter/30">
          <TabsList className="bg-gray-100 dark:bg-navy-light/30">
            <TabsTrigger value="upload" className="data-[state=active]:bg-navy-dark data-[state=active]:text-white dark:data-[state=active]:bg-gold dark:data-[state=active]:text-navy-dark">
              Upload de documentos
            </TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-navy-dark data-[state=active]:text-white dark:data-[state=active]:bg-gold dark:data-[state=active]:text-navy-dark">
              Gerenciar documentos
            </TabsTrigger>
          </TabsList>
        </div>
        
        <div className="py-6">
          <TabsContent value="upload" className="mt-0">
            <Card className="border border-gray-200 dark:border-navy-lighter/30 shadow-sm bg-transparent">
              <CardContent className="p-6">
                <AdminDocumentUpload userId={userId} onDocumentUploaded={handleDocumentUploaded} />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="documents" className="mt-0">
            <Card className="border border-gray-200 dark:border-navy-lighter/30 bg-white dark:bg-navy-deeper shadow-sm">
              
              <CardContent className="p-6">
                <AdminDocumentTable documents={sortedDocuments} isLoading={isLoadingDocuments} loadingDocumentIds={loadingDocumentIds} onDownload={handleDownload} onDelete={handleDeleteDocument} sortOrder={sortOrder} onToggleSort={toggleSortOrder} categories={categories} />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>;
};