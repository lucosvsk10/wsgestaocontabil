
import { useState } from "react";
import { Document } from "@/utils/auth/types";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Download, FileText, Calendar, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DocumentCardProps {
  doc: Document;
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expiresAt: string | null) => boolean;
  daysUntilExpiration: (expiresAt: string | null) => string | null;
  refreshDocuments: () => void;
  loadingDocumentIds: Set<string>;
  handleDownload: (doc: Document) => Promise<void>;
  categoryColor?: string;
  categories?: Array<{ id: string; name: string; color?: string; }>;
}

export const DocumentCard = ({
  doc,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  refreshDocuments,
  loadingDocumentIds,
  handleDownload,
  categoryColor = "#efc349",
  categories = []
}: DocumentCardProps) => {
  const isExpired = isDocumentExpired(doc.expires_at);
  const expirationText = daysUntilExpiration(doc.expires_at);
  const [isHovered, setIsHovered] = useState(false);
  
  // Get the actual category name
  const getCategoryName = () => {
    const category = categories.find(cat => cat.id === doc.category);
    return category?.name || "Documento";
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "bg-transparent border border-gray-200 dark:border-[#efc349]/30 rounded-xl overflow-hidden transition-all duration-300 flex flex-col shadow-sm hover:shadow-md",
        "w-full min-h-[320px] max-h-[360px]",
        "dark:bg-transparent dark:border-[#efc349]/30",
        isHovered ? "shadow-lg transform scale-[1.02] border-[#efc349]/50 dark:border-[#efc349]/60" : ""
      )}
      style={{
        borderLeft: `4px solid ${categoryColor}`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with icon and status */}
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center mr-3 bg-opacity-10" 
              style={{ backgroundColor: `${categoryColor}15` }}
            >
              <FileText className="w-5 h-5" style={{ color: categoryColor }} />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
              {getCategoryName()}
            </div>
          </div>
          {doc.viewed ? (
            <Badge className="bg-green-50 text-green-700 border-green-200 dark:bg-green-600/20 dark:text-green-400 dark:border-green-600/30 text-xs font-extralight">
              <CheckCircle className="w-3 h-3 mr-1" />
              Visualizado
            </Badge>
          ) : (
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-600/20 dark:text-blue-400 dark:border-blue-600/30 text-xs font-extralight">
              Novo
            </Badge>
          )}
        </div>
        
        {/* Document name */}
        <h3 className="text-[#020817] dark:text-[#efc349] font-extralight text-base mb-4 line-clamp-2 flex-grow leading-relaxed">
          {doc.name}
        </h3>
      </div>
      
      {/* Metadata section */}
      <div className="px-5 pb-3 space-y-3 text-sm text-gray-600 dark:text-gray-400 flex-grow font-extralight">
        <div className="flex items-center justify-between">
          <span className="flex items-center">
            <Calendar className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
            Data de Envio:
          </span>
          <span className="text-[#020817] dark:text-gray-300 font-normal">{formatDate(doc.uploaded_at)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center">
            <Clock className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
            Validade:
          </span>
          <span className={cn(
            "font-normal flex items-center",
            isExpired 
              ? "text-red-600 dark:text-red-400" 
              : expirationText 
                ? "text-green-600 dark:text-green-400" 
                : "text-yellow-600 dark:text-yellow-400"
          )}>
            {expirationText || "Sem expiração"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Status:</span>
          <span className="flex items-center font-normal">
            {isExpired ? (
              <>
                <AlertTriangle className="w-4 h-4 mr-1 text-red-600 dark:text-red-400" />
                <span className="text-red-600 dark:text-red-400">Expirado</span>
              </>
            ) : doc.viewed ? (
              <>
                <CheckCircle className="w-4 h-4 mr-1 text-green-600 dark:text-green-400" />
                <span className="text-green-600 dark:text-green-400">Visualizado</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mr-2"></span>
                <span className="text-blue-600 dark:text-blue-400">Novo</span>
              </>
            )}
          </span>
        </div>
      </div>
      
      {/* Download button */}
      <div className="p-5 pt-3">
        <Button
          onClick={() => handleDownload(doc)}
          disabled={loadingDocumentIds.has(doc.id)}
          className="w-full bg-[#020817] hover:bg-[#0f172a] text-white dark:bg-transparent dark:border dark:border-[#efc349] dark:text-[#efc349] dark:hover:bg-[#efc349]/10 dark:hover:border-[#efc349] font-extralight text-sm transition-all duration-300 shadow-sm hover:shadow-md"
        >
          <Download className="w-4 h-4 mr-2" />
          {loadingDocumentIds.has(doc.id) ? "Baixando..." : "Baixar documento"}
        </Button>
      </div>
    </motion.div>
  );
};
