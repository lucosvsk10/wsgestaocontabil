
import { useState } from "react";
import { Document } from "@/utils/auth/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { DocumentCard } from "./document-table/DocumentCard";
import { useDocumentActions } from "@/hooks/document/useDocumentActions";
import { Input } from "@/components/ui/input";
import { Search, Filter, File } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuCheckboxItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface DocumentTableProps {
  documents: Document[];
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expiresAt: string | null) => boolean;
  daysUntilExpiration: (expiresAt: string | null) => string | null;
  refreshDocuments: () => void;
}

export const DocumentTable = ({ 
  documents, 
  formatDate, 
  isDocumentExpired, 
  daysUntilExpiration,
  refreshDocuments
}: DocumentTableProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const isTablet = !isMobile && window.innerWidth < 1024;
  const { loadingDocumentIds, setLoadingDocumentIds, handleDownload } = useDocumentActions();
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  
  // Filter the documents based on search and filters
  const filteredDocuments = documents.filter(doc => {
    // Apply search query
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (doc.filename || doc.original_filename || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    // Apply status filter
    const matchesStatus = 
      statusFilter === "all" ? true :
      statusFilter === "new" ? !doc.viewed :
      statusFilter === "viewed" ? doc.viewed :
      statusFilter === "expired" ? isDocumentExpired(doc.expires_at) :
      statusFilter === "active" ? !isDocumentExpired(doc.expires_at) : 
      true;
      
    return matchesSearch && matchesStatus;
  });
  
  // Sort the filtered documents
  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    switch (sortBy) {
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "date-asc":
        return new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
      case "date-desc":
      default:
        return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
    }
  });

  // Get columns count based on screen size
  const getColumnCount = () => {
    if (isMobile) return 1;
    if (isTablet) return 2;
    return 3;
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400" size={18} />
          <Input 
            type="text" 
            placeholder="Buscar documentos..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white dark:bg-navy-light/20 border-gray-200 dark:border-gold/20"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-white dark:bg-navy-light/20 border-gray-200 dark:border-gold/20">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="new">Novos</SelectItem>
              <SelectItem value="viewed">Visualizados</SelectItem>
              <SelectItem value="expired">Expirados</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] bg-white dark:bg-navy-light/20 border-gray-200 dark:border-gold/20">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Data: Recentes primeiro</SelectItem>
              <SelectItem value="date-asc">Data: Antigos primeiro</SelectItem>
              <SelectItem value="name-asc">Nome: A-Z</SelectItem>
              <SelectItem value="name-desc">Nome: Z-A</SelectItem>
            </SelectContent>
          </Select>
          
          {!isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-white dark:bg-navy-light/20 border-gray-200 dark:border-gold/20">
                  <Filter size={18} />
                  <span className="ml-1">Filtros</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-navy-dark border-gray-200 dark:border-gold/20">
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "new"}
                  onCheckedChange={() => setStatusFilter(statusFilter === "new" ? "all" : "new")}
                >
                  Apenas novos
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "expired"}
                  onCheckedChange={() => setStatusFilter(statusFilter === "expired" ? "all" : "expired")}
                >
                  Apenas expirados
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-gray-600 dark:text-gray-300">
        Exibindo {sortedDocuments.length} {sortedDocuments.length === 1 ? 'documento' : 'documentos'}
        {searchQuery && ` para "${searchQuery}"`}
        {statusFilter !== "all" && (
          <span>
            {' '}com status {
              statusFilter === "new" ? "novos" :
              statusFilter === "viewed" ? "visualizados" :
              statusFilter === "expired" ? "expirados" :
              statusFilter === "active" ? "ativos" : ""
            }
          </span>
        )}
      </div>
      
      {/* Documents Grid */}
      {sortedDocuments.length > 0 ? (
        <div className={`grid grid-cols-1 md:grid-cols-${getColumnCount()} lg:grid-cols-3 xl:grid-cols-4 gap-6`}>
          {sortedDocuments.map((doc, index) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <DocumentCard
                doc={doc}
                formatDate={formatDate}
                isDocumentExpired={isDocumentExpired}
                daysUntilExpiration={daysUntilExpiration}
                refreshDocuments={refreshDocuments}
                loadingDocumentIds={loadingDocumentIds}
                setLoadingDocumentIds={setLoadingDocumentIds}
                handleDownload={handleDownload}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 bg-gray-50 dark:bg-navy-light/10 rounded-lg border border-gray-200 dark:border-gold/20">
          <File className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nenhum documento encontrado</h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {searchQuery 
              ? "Tente ajustar sua busca ou filtros" 
              : "Não há documentos disponíveis no momento"}
          </p>
        </div>
      )}
    </div>
  );
};
