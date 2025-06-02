
import { useState } from "react";
import { Document } from "@/utils/auth/types";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  DocumentCardHeader,
  DocumentCardMetadata,
  DocumentCardActions
} from "./card";

interface DocumentCardProps {
  doc: Document;
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expiresAt: string | null) => boolean;
  daysUntilExpiration: (expiresAt: string | null) => string | null;
  refreshDocuments: () => void;
  loadingDocumentIds: Set<string>;
  handleDownload: (doc: Document) => Promise<void>;
  categoryColor?: string;
}

export const DocumentCard = ({
  doc,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  refreshDocuments,
  loadingDocumentIds,
  handleDownload,
  categoryColor
}: DocumentCardProps) => {
  const isExpired = isDocumentExpired(doc.expires_at);
  const expirationText = daysUntilExpiration(doc.expires_at);
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "p-5 rounded-lg border shadow-sm transition-all duration-200 flex flex-col h-full", 
        isHovered ? "shadow-md transform scale-[1.02]" : "",
        isExpired
          ? "bg-red-50 dark:bg-transparent dark:border-red-500/30 border-red-200" 
          : !doc.viewed
            ? "bg-blue-50 dark:bg-transparent dark:border-blue-500/30 border-blue-200"
            : "bg-white dark:bg-transparent border-gray-200 dark:border-gold/30"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={categoryColor ? { borderColor: `${categoryColor}60` } : {}}
    >
      {/* Card Header with Icon and Status */}
      <DocumentCardHeader doc={doc} isExpired={isExpired} />
      
      {/* Document Title */}
      <h3 className="font-medium text-navy dark:text-[#d9d9d9] text-lg mb-2 line-clamp-2">
        {doc.name}
      </h3>
      
      {/* Document Metadata */}
      <DocumentCardMetadata 
        doc={doc} 
        formatDate={formatDate} 
        isExpired={isExpired} 
        expirationText={expirationText} 
      />
      
      {/* Actions */}
      <DocumentCardActions
        doc={doc}
        loadingDocumentIds={loadingDocumentIds}
        handleDownload={handleDownload}
      />
    </motion.div>
  );
};
