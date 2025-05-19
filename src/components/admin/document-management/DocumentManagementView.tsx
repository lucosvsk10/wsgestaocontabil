
import React, { useState, useEffect } from "react";
import { Search, Filter, Download, Trash2, Calendar, FileType } from "lucide-react";
import { useDocumentManagement } from "@/hooks/document-management/useDocumentManagement";
import { useUserManagement } from "@/hooks/useUserManagement";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DocumentTable } from "./DocumentTable";
import { ClientSelector } from "./ClientSelector";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { addDays } from "date-fns";
import { DateRange } from "react-day-picker";

const DocumentManagementView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { 
    users,
    supabaseUsers,
    isLoadingUsers
  } = useUserManagement();
  
  const {
    selectedUserId,
    setSelectedUserId,
    documents,
    isLoadingDocuments,
    handleDownload,
    handleDeleteDocument,
    loadingDocumentIds
  } = useDocumentManagement(users, supabaseUsers);

  const [filteredDocuments, setFilteredDocuments] = useState(documents);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  // Get all unique categories from documents
  const categories = Array.from(new Set(documents.map(doc => doc.category)));

  // Get selected client name
  useEffect(() => {
    if (selectedUserId && supabaseUsers) {
      const client = supabaseUsers.find(user => user.id === selectedUserId);
      if (client) {
        setSelectedClient(client);
      }
    } else {
      setSelectedClient(null);
    }
  }, [selectedUserId, supabaseUsers]);

  // Filter documents based on search, category, and date range
  useEffect(() => {
    let filtered = [...documents];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.name.toLowerCase().includes(query) || 
        doc.original_filename?.toLowerCase().includes(query) ||
        doc.category.toLowerCase().includes(query) ||
        doc.observations?.toLowerCase().includes(query)
      );
    }
    
    // Filter by category
    if (filterCategory) {
      filtered = filtered.filter(doc => doc.category === filterCategory);
    }
    
    // Filter by date range
    if (dateRange?.from) {
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter(doc => {
        const docDate = new Date(doc.uploaded_at);
        return docDate >= fromDate;
      });
      
      if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        
        filtered = filtered.filter(doc => {
          const docDate = new Date(doc.uploaded_at);
          return docDate <= toDate;
        });
      }
    }
    
    setFilteredDocuments(filtered);
  }, [documents, searchQuery, filterCategory, dateRange]);

  const resetFilters = () => {
    setSearchQuery("");
    setFilterCategory("");
    setDateRange(undefined);
  };

  return (
    <div className="space-y-6">
      <Card className="border border-gray-200 dark:border-navy-light/30 bg-white dark:bg-navy-dark shadow-md">
        <CardHeader className="border-b border-gray-200 dark:border-navy-light/20">
          <CardTitle className="text-lg font-medium text-navy dark:text-gold">
            Gerenciamento de Documentos por Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar for client selection */}
            <div className="lg:col-span-1 space-y-4">
              <h3 className="font-medium text-navy dark:text-gold mb-2">Selecione um Cliente</h3>
              {isLoadingUsers ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : (
                <ClientSelector 
                  users={users} 
                  supabaseUsers={supabaseUsers} 
                  selectedUserId={selectedUserId}
                  onSelectUser={setSelectedUserId}
                />
              )}
            </div>
            
            {/* Main content area */}
            <div className="lg:col-span-3">
              {selectedUserId ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-xl font-medium text-navy dark:text-gold">
                      Documentos de {selectedClient?.user_metadata?.name || selectedClient?.email || 'Cliente'}
                    </h2>
                    <Badge variant="outline" className="bg-navy/10 dark:bg-gold/10 text-navy dark:text-gold border-navy/20 dark:border-gold/20">
                      {filteredDocuments.length} documentos
                    </Badge>
                  </div>
                  
                  {/* Search and filters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <Input
                        placeholder="Buscar documentos..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="w-full">
                        <div className="flex items-center gap-2">
                          <FileType size={16} className="text-gray-500 dark:text-gray-400" />
                          <SelectValue placeholder="Categoria" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todas as categorias</SelectItem>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <DatePickerWithRange 
                      date={dateRange} 
                      setDate={setDateRange}
                      className="w-full"
                    />
                    
                    <Button 
                      variant="outline" 
                      onClick={resetFilters}
                      className="border-gray-300 dark:border-gray-600"
                    >
                      <Filter size={16} className="mr-1" />
                      Limpar filtros
                    </Button>
                  </div>
                  
                  {/* Document table */}
                  <DocumentTable 
                    documents={filteredDocuments} 
                    isLoading={isLoadingDocuments} 
                    loadingDocumentIds={loadingDocumentIds}
                    onDownload={handleDownload}
                    onDelete={handleDeleteDocument}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="bg-gray-50 dark:bg-navy-deeper p-8 rounded-lg text-center max-w-md">
                    <h3 className="text-lg font-medium text-navy dark:text-gold mb-2">
                      Nenhum cliente selecionado
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Selecione um cliente na lista à esquerda para gerenciar seus documentos.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentManagementView;
