
import { useState } from "react";
import { Document } from "@/utils/auth/types";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Download, FileText, Calendar, CheckCircle, AlertTriangle } from "lucide-react";
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
}

export const DocumentCard = ({
  doc,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  refreshDocuments,
  loadingDocumentIds,
  handleDownload,
  categoryColor = "#efc349"
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
        "bg-[#1e293b] dark:bg-[#0b1320] border border-[#334155] dark:border-[#1d2633] rounded-lg overflow-hidden transition-all duration-200 flex flex-col h-full min-h-[200px]",
        isHovered ? "shadow-lg transform scale-[1.02]" : ""
      )}
      style={{
        borderLeft: `4px solid ${categoryColor}`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with icon and status */}
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style={{ backgroundColor: `${categoryColor}15` }}>
              <FileText className="w-4 h-4" style={{ color: categoryColor }} />
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">
              CERTIDÕES
            </div>
          </div>
          {doc.viewed ? (
            <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-xs">
              <CheckCircle className="w-3 h-3 mr-1" />
              Visualizado
            </Badge>
          ) : (
            <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30 text-xs">
              Novo
            </Badge>
          )}
        </div>
        
        {/* Document name */}
        <h3 className="text-white dark:text-[#efc349] font-medium text-sm mb-4 line-clamp-2 flex-grow leading-relaxed">
          {doc.name}
        </h3>
      </div>
      
      {/* Metadata section */}
      <div className="px-4 pb-2 space-y-2 text-xs text-gray-400 dark:text-gray-500 flex-grow">
        <div className="flex items-center justify-between">
          <span className="flex items-center">
            <Calendar className="w-3 h-3 mr-2" />
            Data de Envio:
          </span>
          <span className="text-gray-300 dark:text-gray-400">{formatDate(doc.uploaded_at)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Validade:</span>
          <span className={cn(
            "font-medium",
            isExpired 
              ? "text-red-400" 
              : expirationText 
                ? "text-green-400" 
                : "text-yellow-400"
          )}>
            {expirationText || "Sem expiração"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Status:</span>
          <span className="flex items-center">
            {isExpired ? (
              <>
                <AlertTriangle className="w-3 h-3 mr-1 text-red-400" />
                <span className="text-red-400">Expirado</span>
              </>
            ) : doc.viewed ? (
              <>
                <CheckCircle className="w-3 h-3 mr-1 text-green-400" />
                <span className="text-green-400">Visualizado</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                <span className="text-blue-400">Novo</span>
              </>
            )}
          </span>
        </div>
      </div>
      
      {/* Download button */}
      <div className="p-4 pt-2">
        <Button
          onClick={() => handleDownload(doc)}
          disabled={loadingDocumentIds.has(doc.id)}
          className="w-full bg-[#efc349] hover:bg-[#efc349]/90 text-black font-medium text-sm"
          style={{
            backgroundColor: categoryColor,
            color: '#000000'
          }}
        >
          <Download className="w-4 h-4 mr-2" />
          Baixar documento
        </Button>
      </div>
    </motion.div>
  );
};
