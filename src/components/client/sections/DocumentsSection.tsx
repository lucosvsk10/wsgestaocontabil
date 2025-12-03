import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Eye, Calendar, FileText, AlertTriangle, X } from "lucide-react";
import { Document } from "@/types/admin";
import { DocumentCategory } from "@/types/common";
import { formatDate, isDocumentExpired, daysUntilExpiration } from "@/utils/documentUtils";

interface DocumentsSectionProps {
  documents: Document[];
  documentsByCategory: Record<string, Document[]>;
  categories: DocumentCategory[];
  onDownload: (doc: Document) => Promise<void>;
  refreshDocuments: () => void;
}

export const DocumentsSection = ({
  documents,
  documentsByCategory,
  categories,
  onDownload,
  refreshDocuments
}: DocumentsSectionProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" ? true : 
      statusFilter === "new" ? !doc.viewed : 
      statusFilter === "viewed" ? doc.viewed : 
      statusFilter === "expired" ? isDocumentExpired(doc.expires_at) : true;
    const matchesCategory = selectedCategory === "all" || doc.category === selectedCategory;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSelectedCategory("all");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || selectedCategory !== "all";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header minimalista */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 mx-auto rounded-full bg-foreground/5 flex items-center justify-center">
          <FileText className="w-5 h-5 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-light text-foreground">Documentos</h1>
        <p className="text-sm text-muted-foreground">
          Acesse e baixe seus documentos
        </p>
      </div>

      {/* Filtros em linha */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input 
            placeholder="Buscar documentos..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-foreground/5 border-border/50 text-foreground placeholder:text-muted-foreground focus:border-foreground/30"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-foreground/5 border-border/50 text-foreground">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border">
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="new">Novos</SelectItem>
            <SelectItem value="viewed">Visualizados</SelectItem>
            <SelectItem value="expired">Expirados</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-44 bg-foreground/5 border-border/50 text-foreground">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border">
            <SelectItem value="all">Todas categorias</SelectItem>
            {categories.map(category => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Limpar
          </button>
        )}
      </div>

      {/* Tabs de categoria como texto simples */}
      <div className="flex flex-wrap gap-4 text-sm border-b border-border/30 pb-3">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`transition-colors ${
            selectedCategory === "all" 
              ? "text-foreground font-medium" 
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Todos ({documents.length})
        </button>
        {categories.map(category => {
          const count = documentsByCategory[category.id]?.length || 0;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`transition-colors ${
                selectedCategory === category.id 
                  ? "text-foreground font-medium" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {category.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Contagem de resultados */}
      <p className="text-xs text-muted-foreground">
        {filteredDocuments.length} documento{filteredDocuments.length !== 1 ? 's' : ''} encontrado{filteredDocuments.length !== 1 ? 's' : ''}
      </p>

      {/* Lista de documentos */}
      <div className="space-y-1">
        {filteredDocuments.map((doc, index) => {
          const isExpired = isDocumentExpired(doc.expires_at);
          return (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              className={`group flex items-center justify-between py-4 px-4 rounded-lg transition-all duration-200 hover:bg-foreground/5 ${
                isExpired ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isExpired 
                    ? "bg-destructive/10" 
                    : !doc.viewed 
                      ? "bg-blue-500/10" 
                      : "bg-foreground/5"
                }`}>
                  <FileText className={`w-4 h-4 ${
                    isExpired 
                      ? "text-destructive" 
                      : !doc.viewed 
                        ? "text-blue-500" 
                        : "text-muted-foreground"
                  }`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-foreground truncate">
                      {doc.name}
                    </h3>
                    {!doc.viewed && !isExpired && (
                      <span className="text-[10px] uppercase tracking-wider text-blue-500 font-medium">
                        Novo
                      </span>
                    )}
                    {isExpired && (
                      <span className="text-[10px] uppercase tracking-wider text-destructive font-medium">
                        Expirado
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(doc.uploaded_at)}
                    </span>
                    {doc.expires_at && (
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {isExpired ? "Expirado" : daysUntilExpiration(doc.expires_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isExpired ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              ) : (
                <button 
                  onClick={() => onDownload(doc)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-all duration-200 opacity-0 group-hover:opacity-100"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="text-center py-16">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-foreground/5 flex items-center justify-center">
            <FileText className="w-5 h-5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium text-foreground mb-1">
            Nenhum documento encontrado
          </h3>
          <p className="text-xs text-muted-foreground">
            Tente ajustar os filtros
          </p>
        </div>
      )}
    </motion.div>
  );
};
