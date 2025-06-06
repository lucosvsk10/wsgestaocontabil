
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
      className="container mx-auto p-4 flex-grow px-2 md:px-4 py-6"
    >
      <motion.div variants={itemVariants}>
        <Card className="border-[#e6e6e6] dark:border-[#efc349]/20 bg-white dark:bg-[#0b1320] shadow-sm">
          <CardHeader className="bg-white dark:bg-[#0b1320] border-b border-[#e6e6e6] dark:border-[#efc349]/20">
            <CardTitle className="flex items-center justify-between font-extralight text-[#020817] dark:text-[#efc349] text-3xl">
              Área do Cliente
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-300 font-extralight mt-2">
              Gerencie seus documentos, simulações e acompanhe comunicados importantes
            </p>
          </CardHeader>
          <CardContent className="bg-white dark:bg-[#0b1320] p-6">
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
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};
