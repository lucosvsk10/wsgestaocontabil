
import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, Calendar, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Document } from "@/types/admin";
import { DocumentCategory } from "@/types/common";
import { DocumentCard } from "../../document-table/DocumentCard";
import { formatDate, isDocumentExpired, daysUntilExpiration } from "@/utils/documentUtils";
import { useDocumentActions } from "@/hooks/document/useDocumentActions";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface DocumentsSectionProps {
  isLoadingDocuments: boolean;
  isLoadingCategories: boolean;
  documents: Document[];
  documentsByCategory: Record<string, Document[]>;
  commonCategories: DocumentCategory[];
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  fetchUserDocuments: (userId: string) => void;
  userId: string;
}

export const DocumentsSection = ({
  isLoadingDocuments,
  documents,
  fetchUserDocuments,
  userId
}: DocumentsSectionProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "viewed" | "not_viewed">("all");
  const [dateFilter, setDateFilter] = useState("");
  
  const { loadingDocumentIds, handleDownload } = useDocumentActions();

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "viewed" && doc.viewed) ||
      (statusFilter === "not_viewed" && !doc.viewed);
    const matchesDate = !dateFilter || doc.uploaded_at.includes(dateFilter);
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  if (isLoadingDocuments) {
    return (
      <div className="flex justify-center items-center py-12 bg-[#020817]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="bg-[#020817] min-h-screen">
      <div className="p-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Meus Documentos</h1>
          <p className="text-gray-400">Gerencie e visualize seus documentos enviados</p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#1a1f2e] rounded-xl p-6 mb-8 border border-[#2a3441]"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar documentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#020817] border-[#2a3441] text-white"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-[#020817] border border-[#2a3441] rounded-lg px-3 py-2 text-white focus:border-[#F5C441] focus:outline-none"
            >
              <option value="all">Todos os status</option>
              <option value="viewed">Visualizados</option>
              <option value="not_viewed">Não visualizados</option>
            </select>

            {/* Date Filter */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-10 bg-[#020817] border-[#2a3441] text-white"
              />
            </div>

            {/* Clear Filters */}
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setDateFilter("");
              }}
              className="border-[#2a3441] text-white hover:bg-[#F5C441]/10"
            >
              <Filter className="w-4 h-4 mr-2" />
              Limpar filtros
            </Button>
          </div>
        </motion.div>

        {/* Documents Grid */}
        {filteredDocuments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Nenhum documento encontrado</h3>
            <p className="text-gray-400">
              {searchTerm || statusFilter !== "all" || dateFilter
                ? "Tente ajustar os filtros para encontrar seus documentos"
                : "Você ainda não possui documentos enviados"}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDocuments.map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <DocumentCard
                  doc={doc}
                  formatDate={formatDate}
                  isDocumentExpired={isDocumentExpired}
                  daysUntilExpiration={daysUntilExpiration}
                  refreshDocuments={() => fetchUserDocuments(userId)}
                  loadingDocumentIds={loadingDocumentIds}
                  handleDownload={handleDownload}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
