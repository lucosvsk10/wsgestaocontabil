import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, Download, Eye, Calendar, FileText } from "lucide-react";
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
    const matchesStatus = statusFilter === "all" ? true : statusFilter === "new" ? !doc.viewed : statusFilter === "viewed" ? doc.viewed : statusFilter === "expired" ? isDocumentExpired(doc.expires_at) : true;
    const matchesCategory = selectedCategory === "all" || doc.category === selectedCategory;
    return matchesSearch && matchesStatus && matchesCategory;
  });
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSelectedCategory("all");
  };
  return <Card className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/20">
      <CardHeader className="bg-transparent">
        <CardTitle className="text-[#020817] dark:text-[#efc349] font-extralight flex items-center py-[10px]">
          <FileText className="w-6 h-6 mr-2" />
          Documentos
        </CardTitle>
        
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input placeholder="Buscar documentos..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-white dark:bg-[#020817] border-gray-200 dark:border-[#efc349]/30 text-[#020817] dark:text-white" />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-white dark:bg-[#020817] border-gray-200 dark:border-[#efc349]/30 text-[#020817] dark:text-white">
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
            
            <SelectContent className="bg-white dark:bg-[#020817] border-gray-200 dark:border-[#efc349]/30">
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map(category => <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>)}
            </SelectContent>
          </Select>

          
        </div>
      </CardHeader>
      
      <CardContent className="bg-transparent">
        {/* Tabs por categoria */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map(category => {
          const count = documentsByCategory[category.id]?.length || 0;
          return <Button key={category.id} variant={selectedCategory === category.id ? "default" : "outline"} className={`${selectedCategory === category.id ? "bg-[#efc349] text-[#020817]" : "border-gray-200 dark:border-[#efc349]/30 text-[#020817] dark:text-[#efc349] hover:bg-gray-100 dark:hover:bg-[#efc349]/10"}`} onClick={() => setSelectedCategory(category.id)}>
                {category.name} ({count})
              </Button>;
        })}
        </div>

        {/* Lista de documentos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc, index) => <motion.div key={doc.id} initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.3,
          delay: index * 0.05
        }} className={`p-4 rounded-lg border transition-all hover:border-[#efc349]/50 ${isDocumentExpired(doc.expires_at) ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/30" : !doc.viewed ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-500/30" : "bg-white dark:bg-[#020817] border-gray-200 dark:border-[#efc349]/20"}`}>
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-[#020817] dark:text-white text-lg">{doc.name}</h3>
                <div className="flex gap-2">
                  {!doc.viewed && <Badge className="bg-blue-600 hover:bg-blue-700 text-white">
                      Novo
                    </Badge>}
                  {isDocumentExpired(doc.expires_at) && <Badge className="bg-red-600 hover:bg-red-700 text-white">
                      Expirado
                    </Badge>}
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Enviado: {formatDate(doc.uploaded_at)}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Validade: {daysUntilExpiration(doc.expires_at) || "Sem expiração"}</span>
                </div>
                <div className="flex items-center">
                  <Eye className="w-4 h-4 mr-2" />
                  <span>{doc.viewed ? "Visualizado" : "Não visualizado"}</span>
                </div>
              </div>

              <Button onClick={() => onDownload(doc)} className="w-full bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817] font-extralight">
                <Download className="w-4 h-4 mr-2" />
                Baixar documento
              </Button>
            </motion.div>)}
        </div>

        {filteredDocuments.length === 0 && <div className="text-center py-8 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-extralight">Nenhum documento encontrado</p>
          </div>}
      </CardContent>
    </Card>;
};