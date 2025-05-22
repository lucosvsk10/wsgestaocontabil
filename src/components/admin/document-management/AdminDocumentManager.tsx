import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Document, DocumentCategory } from "@/types/common";
import { AdminDocumentUpload } from "./AdminDocumentUpload";
import { AdminDocumentTable } from "./AdminDocumentTable";
import { DocumentCategoryGroup } from "./DocumentCategoryGroup";
import { EditDocumentDialog } from "./EditDocumentDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { UserInfo } from "./UserInfo";
import { Button } from "@/components/ui/button";
import { FilterX, Search, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDocumentCategories } from "@/hooks/document-management/useDocumentCategories";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  const [activeTab, setActiveTab] = useState<string>("documents");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc"); // Default newest first
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const {
    toast
  } = useToast();

  // Estado para edição de documento
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Estado para confirmação de exclusão
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const {
    categories
  } = useDocumentCategories();
  const sortedDocuments = [...documents].sort((a, b) => {
    const dateA = new Date(a.uploaded_at).getTime();
    const dateB = new Date(b.uploaded_at).getTime();
    return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
  }).filter(doc => {
    // Aplicar pesquisa
    const matchesSearch = searchQuery.toLowerCase() === "" || doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || (doc.original_filename || "").toLowerCase().includes(searchQuery.toLowerCase()) || (doc.observations || "").toLowerCase().includes(searchQuery.toLowerCase());

    // Aplicar filtro de categoria
    const matchesCategory = !filterCategory || doc.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Agrupar documentos por categoria
  const documentsByCategory = categories.reduce((acc, category) => {
    acc[category.id] = sortedDocuments.filter(doc => doc.category === category.id);
    return acc;
  }, {} as Record<string, Document[]>);

  // Documentos sem categoria
  const uncategorizedDocuments = sortedDocuments.filter(doc => !doc.category || !categories.some(cat => cat.id === doc.category));
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "desc" ? "asc" : "desc");
  };
  const handleDocumentUploaded = () => {
    // Muda para a aba de documentos após o upload
    setActiveTab("documents");
  };
  const handleEditDocument = (document: Document) => {
    setEditingDocument(document);
    setIsEditDialogOpen(true);
  };
  const handleConfirmDelete = (document: Document) => {
    setDocumentToDelete(document);
    setIsDeleteDialogOpen(true);
  };
  const handleSaveDocument = async (updatedDocument: Document) => {
    try {
      // Atualizar no banco de dados
      const {
        error
      } = await supabase.from('documents').update({
        name: updatedDocument.name,
        category: updatedDocument.category,
        subcategory: updatedDocument.subcategory,
        observations: updatedDocument.observations,
        expires_at: updatedDocument.expires_at
      }).eq('id', updatedDocument.id);
      if (error) throw error;
      toast({
        title: "Documento atualizado",
        description: "As alterações foram salvas com sucesso."
      });
    } catch (error: any) {
      console.error('Erro ao atualizar documento:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar alterações",
        description: error.message
      });
    }
  };
  const clearFilters = () => {
    setSearchQuery("");
    setFilterCategory(null);
  };
  return <div className="space-y-6">
      <UserInfo userName={userName} userEmail={userEmail} />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b border-gray-200 dark:border-navy-lighter/30">
          <TabsList className="bg-gray-100 dark:bg-navy-light/30">
            <TabsTrigger value="documents" className="data-[state=active]:bg-navy-dark data-[state=active]:text-white dark:data-[state=active]:bg-gold dark:data-[state=active]:text-navy-dark">
              Gerenciar documentos
            </TabsTrigger>
            <TabsTrigger value="upload" className="data-[state=active]:bg-navy-dark data-[state=active]:text-white dark:data-[state=active]:bg-gold dark:data-[state=active]:text-navy-dark">
              Upload de documentos
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
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <Input placeholder="Buscar documentos..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 border-gray-200 dark:border-navy-lighter/30 dark:bg-navy-light/10" />
                    </div>
                    
                    <select value={filterCategory || ''} onChange={e => setFilterCategory(e.target.value || null)} className="h-10 rounded-md border border-gray-200 dark:border-navy-lighter/30 dark:bg-navy-light/10 dark:text-white px-3">
                      <option value="">Todas categorias</option>
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                    
                    <Button variant="outline" size="icon" onClick={toggleSortOrder} className="border-gray-200 dark:border-navy-lighter/30">
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                    
                    <Button variant="outline" size="sm" onClick={clearFilters} className="border-gray-200 dark:border-navy-lighter/30" disabled={!searchQuery && !filterCategory}>
                      <FilterX className="h-4 w-4 mr-1" />
                      Limpar
                    </Button>
                  </div>
                </div>
                
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {sortedDocuments.length} documento{sortedDocuments.length !== 1 ? 's' : ''} encontrado{sortedDocuments.length !== 1 ? 's' : ''}
                </div>
              </CardHeader>
              
              <CardContent className="p-6 pt-0">
                <div className="hidden md:block">
                  {Object.entries(documentsByCategory).filter(([_, docs]) => docs.length > 0).map(([categoryId, docs]) => {
                  const category = categories.find(c => c.id === categoryId);
                  if (!category) return null;
                  return <DocumentCategoryGroup key={categoryId} category={category} documents={docs} loadingDocumentIds={loadingDocumentIds} onDownload={handleDownload} onEdit={handleEditDocument} onDelete={handleConfirmDelete} />;
                })}
                  
                  {uncategorizedDocuments.length > 0 && <DocumentCategoryGroup key="uncategorized" category={{
                  id: "uncategorized",
                  name: "Sem categoria",
                  color: "#6B7280",
                  created_at: "",
                  updated_at: ""
                }} documents={uncategorizedDocuments} loadingDocumentIds={loadingDocumentIds} onDownload={handleDownload} onEdit={handleEditDocument} onDelete={handleConfirmDelete} />}
                  
                  {sortedDocuments.length === 0 && !isLoadingDocuments && <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Nenhum documento encontrado com os filtros atuais.
                    </div>}
                </div>
                
                <div className="md:hidden">
                  <AdminDocumentTable documents={sortedDocuments} isLoading={isLoadingDocuments} loadingDocumentIds={loadingDocumentIds} onDownload={handleDownload} onDelete={handleConfirmDelete} onEdit={handleEditDocument} sortOrder={sortOrder} onToggleSort={toggleSortOrder} categories={categories} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
      
      {/* Diálogo de edição de documento */}
      <EditDocumentDialog open={isEditDialogOpen} document={editingDocument} categories={categories} onClose={() => {
      setIsEditDialogOpen(false);
      setEditingDocument(null);
    }} onSave={handleSaveDocument} />
      
      {/* Diálogo de confirmação de exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-white dark:bg-navy-deeper">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-navy-dark dark:text-gold">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
              Tem certeza que deseja excluir o documento "{documentToDelete?.name}"?
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-100 dark:bg-navy-light/20 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600/90 dark:hover:bg-red-600" onClick={() => {
            if (documentToDelete) {
              handleDeleteDocument(documentToDelete.id);
            }
            setDocumentToDelete(null);
          }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
};