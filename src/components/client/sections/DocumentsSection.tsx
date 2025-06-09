
import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentTabs } from "../DocumentTabs";
import { Document, DocumentCategory } from "@/types/common";
import { formatDate, isDocumentExpired, daysUntilExpiration } from "@/utils/documentUtils";
import { FileText, FolderOpen } from "lucide-react";

interface DocumentsSectionProps {
  documents: Document[];
  documentsByCategory: Record<string, Document[]>;
  categories: DocumentCategory[];
  onDownload: (documentId: string) => void;
  refreshDocuments: () => void;
}

export const DocumentsSection = ({
  documents,
  documentsByCategory,
  categories,
  onDownload,
  refreshDocuments
}: DocumentsSectionProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const totalDocuments = documents.length;
  const unreadDocuments = documents.filter(doc => !doc.viewed).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header da seção */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#efc349]/10 dark:bg-[#efc349]/20 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-[#efc349]" />
          </div>
          <div>
            <h2 className="text-2xl font-extralight text-[#020817] dark:text-white">
              Meus Documentos
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 font-extralight">
              {totalDocuments} documentos • {unreadDocuments} não visualizados
            </p>
          </div>
        </div>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-300 font-extralight">Total</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-200">{totalDocuments}</p>
              </div>
              <FolderOpen className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 dark:text-orange-300 font-extralight">Não Lidos</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-200">{unreadDocuments}</p>
              </div>
              <FileText className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-300 font-extralight">Categorias</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-200">{categories.length}</p>
              </div>
              <FolderOpen className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de documentos */}
      <div className="bg-white dark:bg-[#0b1320] border border-[#e6e6e6] dark:border-[#efc349]/20 rounded-xl p-6">
        <DocumentTabs
          documents={documents}
          allDocuments={documents}
          documentsByCategory={documentsByCategory}
          categories={categories}
          setSelectedCategory={setSelectedCategory}
          formatDate={formatDate}
          isDocumentExpired={isDocumentExpired}
          daysUntilExpiration={daysUntilExpiration}
          refreshDocuments={refreshDocuments}
          activeCategory={selectedCategory || categories[0]?.id || ''}
        />
      </div>
    </motion.div>
  );
};
