
import React from "react";
import { Document } from "@/utils/auth/types";
import { motion } from "framer-motion";
import { DocumentCard } from "./DocumentCard";
import { useIsMobile } from "@/hooks/use-mobile";

interface DocumentGridProps {
  documents: Document[];
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expiresAt: string | null) => boolean;
  daysUntilExpiration: (expiresAt: string | null) => string | null;
  refreshDocuments: () => void;
  loadingDocumentIds: Set<string>;
  handleDownload: (doc: Document) => Promise<void>;
  categoryColor?: string;
  categories?: Array<{ id: string; name: string; color?: string; }>;
}

export const DocumentGrid = ({
  documents,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  refreshDocuments,
  loadingDocumentIds,
  handleDownload,
  categoryColor,
  categories = []
}: DocumentGridProps) => {
  // Function to get category color for a document
  const getCategoryColor = (doc: Document) => {
    if (categoryColor) return categoryColor;
    const category = categories.find(cat => cat.id === doc.category);
    return category?.color || "#efc349";
  };
  
  return (
    <div className="w-full px-4 py-6">
      {/* Responsive grid with proper gaps and breakpoints */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {documents.map((doc, index) => (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="w-full min-w-[280px] max-w-[400px] mx-auto"
          >
            <DocumentCard
              doc={doc}
              formatDate={formatDate}
              isDocumentExpired={isDocumentExpired}
              daysUntilExpiration={daysUntilExpiration}
              refreshDocuments={refreshDocuments}
              loadingDocumentIds={loadingDocumentIds}
              handleDownload={handleDownload}
              categoryColor={getCategoryColor(doc)}
              categories={categories}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};
