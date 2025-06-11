import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, Download, Eye, Calendar, FileText, AlertTriangle } from "lucide-react";
import { Document } from "@/types/admin";
import { DocumentCategory } from "@/types/common";
import { Badge } from "@/components/ui/badge";
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

  return (
    <Card className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/20 shadow-sm">
      <CardHeader className="bg-white dark:bg-[#0b1320] border-b border-gray-200 dark:border-[#efc349]/20">
        <CardTitle className="text-[#020817] dark:text-[#efc349] font-semibold flex items-center text-2xl">
          <FileText className="w-6 h-6 mr-3" />
          Documentos
          <Badge variant="outline" className="ml-3 border-gray-300 dark:border-[#efc349]/30 text-[#020817] dark:text-[#efc349] font-normal">
            {filteredDocuments.length} documento{filteredDocuments.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
        
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input 
              placeholder="Buscar documentos..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white dark:bg-[#020817] border-gray-300 dark:border-[#efc349]/30 text-[#020817] dark:text-white focus:border-[#efc349] transition-all duration-300"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-white dark:bg-[#020817] border-gray-300 dark:border-[#efc349]/30 text-[#020817] dark:text-white focus:border-[#efc349]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#020817] border-gray-200 dark:border-[#efc349]/30">
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="new">Novos</SelectItem>
              <SelectItem value="viewed">Visualizados</SelectItem>
              <SelectItem value="expired">Expirados</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="bg-white dark:bg-[#020817] border-gray-300 dark:border-[#efc349]/30 text-[#020817] dark:text-white focus:border-[#efc349]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#020817] border-gray-200 dark:border-[#efc349]/30">
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={clearFilters}
            className="border-gray-300 dark:border-[#efc349]/30 text-[#020817] dark:text-[#efc349] hover:bg-gray-50 dark:hover:bg-[#efc349]/10 transition-all duration-300"
          >
            <Filter className="w-4 h-4 mr-2" />
            Limpar
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="bg-white dark:bg-[#0b1320] p-6">
        {/* Tabs por categoria */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            className={`${
              selectedCategory === "all" 
                ? "bg-[#efc349] hover:bg-[#d4a843] text-[#020817] font-medium" 
                : "border-gray-300 dark:border-[#efc349]/30 text-[#020817] dark:text-[#efc349] hover:bg-gray-50 dark:hover:bg-[#efc349]/10"
            } transition-all duration-300`}
            onClick={() => setSelectedCategory("all")}
          >
            Todos ({documents.length})
          </Button>
          {categories.map(category => {
            const count = documentsByCategory[category.id]?.length || 0;
            return (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                className={`${
                  selectedCategory === category.id 
                    ? "bg-[#efc349] hover:bg-[#d4a843] text-[#020817] font-medium" 
                    : "border-gray-300 dark:border-[#efc349]/30 text-[#020817] dark:text-[#efc349] hover:bg-gray-50 dark:hover:bg-[#efc349]/10"
                } transition-all duration-300`}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name} ({count})
              </Button>
            );
          })}
        </div>

        {/* Lista de documentos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc, index) => {
            const isExpired = isDocumentExpired(doc.expires_at);
            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`p-6 rounded-xl border transition-all hover:shadow-md hover:border-[#efc349]/50 ${
                  isExpired 
                    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/30 opacity-60" 
                    : !doc.viewed 
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-500/30" 
                      : "bg-white dark:bg-[#020817] border-gray-200 dark:border-[#efc349]/20"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-[#020817] dark:text-white text-lg leading-tight">{doc.name}</h3>
                  <div className="flex gap-2">
                    {!doc.viewed && !isExpired && (
                      <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
                        Novo
                      </Badge>
                    )}
                    {isExpired && (
                      <Badge className="bg-red-600 hover:bg-red-700 text-white font-medium">
                        Expirado
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300 mb-6">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                    <span>Enviado: {formatDate(doc.uploaded_at)}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                    <span>Validade: {isExpired ? "Expirado" : daysUntilExpiration(doc.expires_at) || "Sem expiração"}</span>
                  </div>
                  <div className="flex items-center">
                    <Eye className="w-4 h-4 mr-2 text-gray-500" />
                    <span>{doc.viewed ? "Visualizado" : "Não visualizado"}</span>
                  </div>
                </div>

                {isExpired ? (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md font-medium transition-all duration-300 py-3 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Expirado
                  </div>
                ) : (
                  <Button 
                    onClick={() => onDownload(doc)} 
                    className="w-full bg-[#efc349] hover:bg-[#d4a843] text-[#020817] font-medium transition-all duration-300 hover:shadow-sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar documento
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>

        {filteredDocuments.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-[#020817] rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 text-gray-400 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-[#020817] dark:text-white mb-2">
              Nenhum documento encontrado
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Tente ajustar os filtros para encontrar o que procura
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
