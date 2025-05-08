
import { useState } from "react";
import { Document } from "@/utils/auth/types";
import { Download, FileText, File, FileImage, Clock, Eye, EyeOff, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DocumentCardProps {
  doc: Document;
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expiresAt: string | null) => boolean;
  daysUntilExpiration: (expiresAt: string | null) => string | null;
  refreshDocuments: () => void;
  loadingDocumentIds: Set<string>;
  handleDownload: (doc: Document) => Promise<void>;
}

// Helper function to get the appropriate icon based on file type
const getDocumentIcon = (doc: Document) => {
  const filename = doc.filename || doc.original_filename || "";
  const extension = filename.split('.').pop()?.toLowerCase();
  
  if (!extension) return <File className="h-8 w-8 text-navy dark:text-gold" />;
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
    return <FileImage className="h-8 w-8 text-blue-600 dark:text-blue-400" />;
  }
  
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(extension)) {
    return <FileText className="h-8 w-8 text-red-600 dark:text-red-400" />;
  }
  
  return <File className="h-8 w-8 text-navy dark:text-gold" />;
};

export const DocumentCard = ({
  doc,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  refreshDocuments,
  loadingDocumentIds,
  handleDownload
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
          ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30" 
          : !doc.viewed
            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/50"
            : "bg-white dark:bg-navy-light/20 border-gray-200 dark:border-gold/20"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card Header with Icon and Status */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center">
          {getDocumentIcon(doc)}
          <div className="ml-2">
            {!doc.viewed ? (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-600 dark:text-white text-xs">
                Novo
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 text-xs">
                Visualizado
              </Badge>
            )}
          </div>
        </div>
        
        {isExpired && (
          <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-700 dark:text-white">
            Expirado
          </Badge>
        )}
      </div>
      
      {/* Document Title */}
      <h3 className="font-medium text-navy dark:text-white text-lg mb-2 line-clamp-2">
        {doc.name}
      </h3>
      
      {/* Document Metadata */}
      <div className="mt-auto space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-300">Data de Envio:</span>
          <span className="text-gray-800 dark:text-gray-100 font-medium">{formatDate(doc.uploaded_at)}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-300">Validade:</span>
          <span className={cn(
            "flex items-center",
            isExpired
              ? "text-red-600 dark:text-red-400" 
              : "text-green-600 dark:text-green-400"
          )}>
            <Clock size={14} className="mr-1" />
            <span>{expirationText || "Sem expiração"}</span>
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-300">Status:</span>
          <div className="flex items-center">
            {doc.viewed ? (
              <span className="flex items-center text-green-600 dark:text-green-400">
                <Eye size={14} className="mr-1" />
                <span>Visualizado</span>
              </span>
            ) : (
              <span className="flex items-center text-blue-600 dark:text-blue-400">
                <EyeOff size={14} className="mr-1" />
                <span>Não visualizado</span>
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="mt-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleDownload(doc)} 
          disabled={loadingDocumentIds.has(doc.id)} 
          className="w-full bg-white dark:bg-navy-light/30 border-gold/20 text-navy dark:text-gold hover:bg-gold/10 hover:text-navy dark:hover:bg-gold/20 dark:hover:text-navy flex items-center justify-center gap-1"
        >
          <Download size={14} />
          <span className="truncate">
            {loadingDocumentIds.has(doc.id) ? "Baixando..." : "Baixar documento"}
          </span>
        </Button>
      </div>
    </motion.div>
  );
};
