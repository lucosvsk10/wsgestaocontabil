
import { useState } from "react";
import { Document } from "@/utils/auth/types";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Download, FileText, Calendar, CheckCircle, AlertTriangle, Eye } from "lucide-react";
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
        "bg-white/70 dark:bg-[#0b1320]/80 backdrop-blur-sm border border-gray-200/50 dark:border-[#1d2633]/80 rounded-xl overflow-hidden transition-all duration-300 flex flex-col shadow-sm hover:shadow-lg",
        "w-full min-h-[320px] min-w-[280px]", 
        isHovered ? "transform scale-[1.02] shadow-xl" : ""
      )}
      style={{
        borderLeft: `4px solid ${categoryColor}`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with icon and category */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center mr-3" 
              style={{ backgroundColor: `${categoryColor}20` }}
            >
              <FileText className="w-6 h-6" style={{ color: categoryColor }} />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
              {getCategoryName()}
            </div>
          </div>
          {doc.viewed ? (
            <Badge className="bg-green-50 text-green-700 border-green-200 dark:bg-green-600/20 dark:text-green-400 dark:border-green-600/30 text-xs">
              <Eye className="w-3 h-3 mr-1" />
              Visualizado
            </Badge>
          ) : (
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-600/20 dark:text-blue-400 dark:border-blue-600/30 text-xs">
              Novo
            </Badge>
          )}
        </div>
        
        {/* Document name with proper spacing */}
        <h3 className="text-gray-900 dark:text-[#efc349] font-medium text-base mb-4 leading-relaxed min-h-[3rem] break-words">
          {doc.name}
        </h3>
      </div>
      
      {/* Metadata section with more space */}
      <div className="px-6 pb-4 space-y-4 text-sm flex-grow">
        <div className="flex items-center justify-between">
          <span className="flex items-center text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4 mr-2" />
            Data de Envio:
          </span>
          <span className="text-gray-800 dark:text-gray-300 font-medium">{formatDate(doc.uploaded_at)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Validade:</span>
          <span className={cn(
            "font-medium",
            isExpired 
              ? "text-red-600 dark:text-red-400" 
              : expirationText 
                ? "text-green-600 dark:text-green-400" 
                : "text-amber-600 dark:text-yellow-400"
          )}>
            {expirationText || "Sem expiração"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Status:</span>
          <span className="flex items-center">
            {isExpired ? (
              <>
                <AlertTriangle className="w-4 h-4 mr-1 text-red-600 dark:text-red-400" />
                <span className="text-red-600 dark:text-red-400 font-medium">Expirado</span>
              </>
            ) : doc.viewed ? (
              <>
                <CheckCircle className="w-4 h-4 mr-1 text-green-600 dark:text-green-400" />
                <span className="text-green-600 dark:text-green-400 font-medium">Visualizado</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">Novo</span>
              </>
            )}
          </span>
        </div>
      </div>
      
      {/* Download button with more padding */}
      <div className="p-6 pt-4">
        <Button
          onClick={() => handleDownload(doc)}
          disabled={loadingDocumentIds.has(doc.id)}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white dark:bg-transparent dark:border dark:border-[#efc349] dark:text-white dark:hover:bg-[#efc349]/10 dark:hover:border-[#efc349] font-medium text-sm transition-all duration-300 shadow-sm hover:shadow-md min-h-[44px]"
        >
          <Download className="w-4 h-4 mr-2" />
          {loadingDocumentIds.has(doc.id) ? "Baixando..." : "Baixar documento"}
        </Button>
      </div>
    </motion.div>
  );
};
