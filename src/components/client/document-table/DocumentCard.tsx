
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
        "bg-[#1e293b] dark:bg-[#1e293b] border border-[#334155] rounded-lg p-4 transition-all duration-200 flex flex-col h-full min-h-[200px]",
        isHovered ? "shadow-md transform scale-[1.02]" : ""
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with icon and status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-[#efc349]/10 rounded-lg flex items-center justify-center mr-3">
            <FileText className="w-4 h-4 text-[#efc349]" />
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">
            CERTIDÕES
          </div>
        </div>
        {doc.viewed ? (
          <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Visualizado
          </Badge>
        ) : (
          <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">
            Novo
          </Badge>
        )}
      </div>
      
      {/* Document name */}
      <h3 className="text-white font-medium text-sm mb-4 line-clamp-2 flex-grow">
        {doc.name}
      </h3>
      
      {/* Metadata */}
      <div className="space-y-2 mb-4 text-xs text-gray-400">
        <div className="flex items-center justify-between">
          <span>Data de Envio:</span>
          <span>{formatDate(doc.uploaded_at)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Validade:</span>
          <span className={isExpired ? "text-red-400" : "text-green-400"}>
            {expirationText || "Sem expiração"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Status:</span>
          <span className="flex items-center">
            {isExpired ? (
              <>
                <AlertTriangle className="w-3 h-3 mr-1 text-red-400" />
                <span className="text-red-400">Sem expiração</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-3 h-3 mr-1 text-green-400" />
                <span className="text-green-400">Visualizado</span>
              </>
            )}
          </span>
        </div>
      </div>
      
      {/* Download button */}
      <Button
        onClick={() => handleDownload(doc)}
        disabled={loadingDocumentIds.has(doc.id)}
        className="w-full bg-[#efc349] hover:bg-[#efc349]/90 text-black font-medium"
      >
        <Download className="w-4 h-4 mr-2" />
        Baixar documento
      </Button>
    </motion.div>
  );
};
