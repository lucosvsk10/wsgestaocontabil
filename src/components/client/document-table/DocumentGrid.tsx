
import React from "react";
import { Document } from "@/utils/auth/types";
import { motion } from "framer-motion";
import { DocumentCard } from "./DocumentCard";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface DocumentGridProps {
  documents: Document[];
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expiresAt: string | null) => boolean;
  daysUntilExpiration: (expiresAt: string | null) => string | null;
  refreshDocuments: () => void;
  loadingDocumentIds: Set<string>;
  handleDownload: (doc: Document) => Promise<void>;
  categoryColor?: string;
}

export const DocumentGrid = ({
  documents,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  refreshDocuments,
  loadingDocumentIds,
  handleDownload,
  categoryColor
}: DocumentGridProps) => {
  const isMobile = useIsMobile();
  
  // Grid columns based on screen size
  const gridClasses = cn(
    "grid gap-6",
    isMobile 
      ? "grid-cols-1" 
      : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
  );
  
  return (
    <div className={gridClasses}>
      {documents.map((doc, index) => (
        <motion.div
          key={doc.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <DocumentCard
            doc={doc}
            formatDate={formatDate}
            isDocumentExpired={isDocumentExpired}
            daysUntilExpiration={daysUntilExpiration}
            refreshDocuments={refreshDocuments}
            loadingDocumentIds={loadingDocumentIds}
            handleDownload={handleDownload}
            categoryColor={categoryColor}
          />
        </motion.div>
      ))}
    </div>
  );
};
