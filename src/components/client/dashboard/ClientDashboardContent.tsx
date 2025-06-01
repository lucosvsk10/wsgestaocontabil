
import { ClientNavigation } from "../ClientNavigation";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { formatDate, isDocumentExpired, daysUntilExpiration } from "@/utils/documentUtils";
import { motion } from "framer-motion";
import { Document } from "@/types/admin";
import { DocumentCategory } from "@/types/common";

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
      className="flex-grow"
    >
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <motion.div variants={itemVariants}>
          <div className="bg-[#1a2332] rounded-2xl border border-[#efc349]/20 shadow-xl">
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
