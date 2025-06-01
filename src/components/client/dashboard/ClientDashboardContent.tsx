
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { formatDate, isDocumentExpired, daysUntilExpiration } from "@/utils/documentUtils";
import { motion } from "framer-motion";
import { Document } from "@/types/admin";
import { DocumentCategory } from "@/types/common";
import { Search, Filter, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DocumentGrid } from "../document-table/DocumentGrid";
import { useState } from "react";
import { useDocumentActions } from "@/hooks/document/useDocumentActions";

interface ClientDashboardContentProps {
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

export const ClientDashboardContent = ({
  isLoadingDocuments,
  isLoadingCategories,
  documents,
  documentsByCategory,
  commonCategories,
  selectedCategory,
  setSelectedCategory,
  fetchUserDocuments,
  userId
}: ClientDashboardContentProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { loadingDocumentIds, handleDownload } = useDocumentActions(() => fetchUserDocuments(userId));

  // Get current documents based on selected category
  const currentDocuments = selectedCategory 
    ? documentsByCategory[selectedCategory] || []
    : documents;

  // Filter documents based on search query
  const filteredDocuments = currentDocuments.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.original_filename?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1 
      } 
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex-grow bg-[#020817] text-white"
    >
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <h1 className="text-3xl font-light text-[#efc349] mb-2">
            Documentos - Documentações
          </h1>
        </motion.div>

        {/* Category Tabs */}
        <motion.div variants={itemVariants} className="mb-6">
          <div className="flex flex-wrap gap-2">
            {commonCategories.map((category) => {
              const count = documentsByCategory[category.id]?.length || 0;
              const isActive = selectedCategory === category.id;
              
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#efc349] text-[#020817]'
                      : 'bg-[#1a2332] text-gray-300 hover:bg-[#2a3342] hover:text-white'
                  }`}
                >
                  {category.name} {count > 0 && <span className="ml-1">{count}</span>}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Section Title with Icon */}
        <motion.div variants={itemVariants} className="flex items-center gap-3 mb-6">
          <div className="w-3 h-3 bg-[#8b5cf6] rounded-full"></div>
          <h2 className="text-xl font-medium text-[#8b5cf6]">
            {selectedCategory ? commonCategories.find(c => c.id === selectedCategory)?.name : 'Documentações'}
          </h2>
        </motion.div>

        {/* Search and Filters */}
        <motion.div variants={itemVariants} className="mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                type="text"
                placeholder="Buscar documentos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#1a2332] border-[#2a3342] text-white placeholder-gray-400 focus:border-[#efc349]"
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="bg-[#1a2332] border-[#2a3342] text-gray-300 hover:bg-[#2a3342] hover:text-white"
              >
                Todos os status
                <ChevronDown size={16} className="ml-2" />
              </Button>
              
              <Button
                variant="outline"
                className="bg-[#1a2332] border-[#2a3342] text-gray-300 hover:bg-[#2a3342] hover:text-white"
              >
                Data: Recentes...
                <ChevronDown size={16} className="ml-2" />
              </Button>
              
              <Button
                variant="outline"
                className="bg-[#1a2332] border-[#2a3342] text-gray-300 hover:bg-[#2a3342] hover:text-white"
              >
                <Filter size={16} className="mr-2" />
                Filtros
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Documents Count */}
        <motion.div variants={itemVariants} className="mb-6">
          <p className="text-gray-400 text-sm">
            Exibindo {filteredDocuments.length} documentos
          </p>
        </motion.div>

        {/* Content */}
        <motion.div variants={itemVariants}>
          {isLoadingDocuments || isLoadingCategories ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">
                {searchQuery ? 'Nenhum documento encontrado para sua busca.' : 'Nenhum documento disponível nesta categoria.'}
              </p>
            </div>
          ) : (
            <DocumentGrid
              documents={filteredDocuments}
              formatDate={formatDate}
              isDocumentExpired={isDocumentExpired}
              daysUntilExpiration={daysUntilExpiration}
              refreshDocuments={() => fetchUserDocuments(userId)}
              loadingDocumentIds={loadingDocumentIds}
              handleDownload={handleDownload}
            />
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};
