
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
      whileHover={{ scale: 1.02 }}
      className={cn(
        "relative p-6 rounded-2xl border shadow-lg transition-all duration-300 flex flex-col h-full overflow-hidden",
        "bg-white/80 dark:bg-[#0b1320]/80 backdrop-blur-sm",
        isExpired
          ? "border-red-300/50 dark:border-red-500/30 shadow-red-100/50 dark:shadow-red-900/20" 
          : !doc.viewed
            ? "border-blue-300/50 dark:border-blue-500/30 shadow-blue-100/50 dark:shadow-blue-900/20"
            : "border-[#efc349]/30 dark:border-[#efc349]/20 shadow-[#efc349]/10"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Gradient overlay */}
      <div className={cn(
        "absolute inset-0 opacity-5 transition-opacity duration-300",
        isExpired
          ? "bg-gradient-to-br from-red-500 to-red-600"
          : !doc.viewed
            ? "bg-gradient-to-br from-blue-500 to-blue-600"
            : "bg-gradient-to-br from-[#efc349] to-[#d4a017]"
      )} />
      
      {/* Card Header with Icon and Status */}
      <DocumentCardHeader doc={doc} isExpired={isExpired} />
      
      {/* Document Title */}
      <h3 className="font-medium text-[#020817] dark:text-[#d9d9d9] text-lg mb-3 line-clamp-2 relative z-10">
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
