
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  // Animation variants for page elements
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
      className="flex-grow p-4 md:p-6 lg:p-8 bg-[#020817]"
    >
      <motion.div variants={itemVariants} className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Área do Cliente
          </h1>
          <p className="text-gray-400 text-lg">
            Gerencie seus documentos e acompanhe comunicados importantes
          </p>
        </div>

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
      </motion.div>
    </motion.div>
  );
};
