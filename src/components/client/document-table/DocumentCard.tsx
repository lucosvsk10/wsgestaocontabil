
import { useState } from "react";
import { Document } from "@/utils/auth/types";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { FileText, Download, Eye, Clock } from "lucide-react";
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
      whileHover={{ scale: 1.02 }}
      className={cn(
        "relative p-6 rounded-xl border shadow-lg transition-all duration-300 flex flex-col h-full overflow-hidden",
        "bg-[#2a3441] border-[#efc349]/20",
        isExpired
          ? "border-red-500/50 shadow-red-900/20" 
          : !doc.viewed
            ? "border-blue-500/50 shadow-blue-900/20"
            : "border-[#efc349]/30 shadow-[#efc349]/10"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card Header with Icon and Status */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#efc349]/10 rounded-lg">
            <FileText className="w-6 h-6 text-[#efc349]" />
          </div>
          <div className="flex flex-col gap-1">
            {doc.viewed ? (
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/30">
                Visualizado
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                Novo
              </Badge>
            )}
            {isExpired && (
              <Badge variant="destructive" className="text-xs bg-red-500/10 text-red-400 border-red-500/30">
                Expirado
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      {/* Document Title */}
      <h3 className="font-medium text-white text-lg mb-4 line-clamp-2">
        {doc.name}
      </h3>
      
      {/* Document Metadata */}
      <div className="mt-auto space-y-3 text-sm">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Data de Envio:</span>
            <span className="text-white font-medium">{formatDate(doc.uploaded_at)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Validade:</span>
            <div className={cn(
              "flex items-center gap-1",
              isExpired ? "text-red-400" : "text-green-400"
            )}>
              <Clock className="w-3 h-3" />
              <span className="text-xs">{expirationText || "Sem expiração"}</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Status:</span>
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span className={cn(
                "text-xs",
                doc.viewed ? "text-green-400" : "text-blue-400"
              )}>
                {doc.viewed ? "Visualizado" : "Não visualizado"}
              </span>
            </div>
          </div>
        </div>
        
        {/* Download Button */}
        <Button 
          onClick={() => handleDownload(doc)} 
          disabled={loadingDocumentIds.has(doc.id)} 
          className="w-full bg-[#efc349] hover:bg-[#d4a017] text-[#0b1320] font-medium"
          size="sm"
        >
          <Download className="w-4 h-4 mr-2" />
          {loadingDocumentIds.has(doc.id) ? "Baixando..." : "Baixar documento"}
        </Button>
      </div>
    </motion.div>
  );
};
