
import { useState } from "react";
import { Document } from "@/utils/auth/types";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Download, FileText, Clock, Eye, EyeOff } from "lucide-react";
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
        "relative p-6 rounded-2xl border-2 shadow-lg transition-all duration-300 overflow-hidden",
        "bg-[#1a2633] dark:bg-[#1a2633] border-[#2d3748]",
        "hover:shadow-xl hover:border-[#efc349]/50"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header com ícone e status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#efc349]/20 rounded-lg">
            <FileText className="w-6 h-6 text-[#efc349]" />
          </div>
          <div>
            {!doc.viewed ? (
              <Badge className="bg-[#efc349] text-[#0b1320] hover:bg-[#efc349]/90 text-xs font-medium">
                Novo
              </Badge>
            ) : (
              <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
                <Eye className="w-3 h-3 mr-1" />
                Visualizado
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Título do documento */}
      <h3 className="text-[#efc349] font-semibold text-lg mb-4 line-clamp-2 uppercase tracking-wide">
        {doc.name}
      </h3>

      {/* Informações do documento */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Data de Envio:</span>
          <span className="text-white text-sm font-medium">{formatDate(doc.uploaded_at)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Validade:</span>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span className={cn(
              "text-sm font-medium",
              isExpired ? "text-red-400" : "text-green-400"
            )}>
              {expirationText || "Sem expiração"}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Status:</span>
          <div className="flex items-center gap-1">
            {doc.viewed ? (
              <>
                <Eye className="w-3 h-3 text-green-400" />
                <span className="text-green-400 text-sm">Visualizado</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3 h-3 text-blue-400" />
                <span className="text-blue-400 text-sm">Não visualizado</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Botão de download */}
      <Button 
        onClick={() => handleDownload(doc)} 
        disabled={loadingDocumentIds.has(doc.id)}
        className="w-full bg-[#efc349] hover:bg-[#efc349]/90 text-[#0b1320] font-medium py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
      >
        <Download className="w-4 h-4" />
        {loadingDocumentIds.has(doc.id) ? "Baixando..." : "Baixar documento"}
      </Button>

      {/* Indicador de expiração */}
      {isExpired && (
        <div className="absolute top-2 right-2">
          <Badge variant="destructive" className="bg-red-600 text-white text-xs">
            Expirado
          </Badge>
        </div>
      )}
    </motion.div>
  );
};
