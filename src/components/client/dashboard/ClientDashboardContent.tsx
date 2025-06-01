
import { ClientNavigation } from "../ClientNavigation";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { formatDate, isDocumentExpired, daysUntilExpiration } from "@/utils/documentUtils";
import { motion } from "framer-motion";
import { Document } from "@/types/admin";
import { DocumentCategory } from "@/types/common";
import { Sparkles } from "lucide-react";

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
      className="flex-grow pb-24"
    >
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <motion.div variants={itemVariants} className="mb-8">
          <div className="bg-white/80 dark:bg-[#0b1320]/80 backdrop-blur-sm border border-[#efc349]/20 rounded-2xl shadow-xl">
            <div className="p-6 border-b border-[#efc349]/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-r from-[#efc349] to-[#d4a017] rounded-xl shadow-lg">
                  <Sparkles className="w-6 h-6 text-[#0b1320]" />
                </div>
                <div>
                  <h1 className="text-3xl font-light text-[#020817] dark:text-[#efc349]">
                    Área do Cliente
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-light">
                    Gerencie seus documentos e acompanhe informações importantes
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {isLoadingDocuments || isLoadingCategories ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : (
                <ClientNavigation
                  documents={[]} 
                  allDocuments={documents} 
                  documentsByCategory={documentsByCategory} 
                  categories={commonCategories} 
                  setSelectedCategory={setSelectedCategory} 
                  formatDate={formatDate} 
                  isDocumentExpired={isDocumentExpired} 
                  daysUntilExpiration={daysUntilExpiration} 
                  refreshDocuments={() => fetchUserDocuments(userId)} 
                  activeCategory={selectedCategory || ''}
                />
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
