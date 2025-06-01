
import { useState } from "react";
import { Document } from "@/utils/auth/types";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { FileText, Download, Clock } from "lucide-react";
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
        "relative p-6 rounded-xl border transition-all duration-300 flex flex-col h-full",
        "bg-[#1a2332] border-[#2a3342] hover:border-[#efc349]/50"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Status Badges */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-8 h-8 text-[#efc349]" />
        </div>
        <div className="flex gap-2">
          {!doc.viewed ? (
            <Badge className="bg-blue-600 text-white text-xs px-2 py-1">
              Novo
            </Badge>
          ) : (
            <Badge variant="outline" className="border-green-500 text-green-400 text-xs px-2 py-1">
              Visualizado
            </Badge>
          )}
          
          {isExpired && (
            <Badge className="bg-red-600 text-white text-xs px-2 py-1">
              Expirado
            </Badge>
          )}
        </div>
      </div>
      
      {/* Document Title */}
      <h3 className="font-semibold text-white text-lg mb-4 line-clamp-2">
        {doc.name}
      </h3>
      
      {/* Document Metadata */}
      <div className="mt-auto space-y-3 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Data de Envio:</span>
          <span className="text-white font-medium">{formatDate(doc.uploaded_at)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Validade:</span>
          <span className={cn(
            "flex items-center font-medium",
            isExpired ? "text-red-400" : "text-green-400"
          )}>
            {isExpired ? (
              <>
                <Clock size={14} className="mr-1" />
                Expirado
              </>
            ) : expirationText ? (
              <>
                <Clock size={14} className="mr-1" />
                {expirationText}
              </>
            ) : (
              "Sem expiração"
            )}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Status:</span>
          <span className={cn(
            "font-medium",
            doc.viewed ? "text-green-400" : "text-blue-400"
          )}>
            {doc.viewed ? "Visualizado" : "Não visualizado"}
          </span>
        </div>
        
        {/* Download Button */}
        <div className="pt-4">
          <Button 
            onClick={() => handleDownload(doc)} 
            disabled={loadingDocumentIds.has(doc.id)} 
            className="w-full bg-[#efc349] hover:bg-[#d4a017] text-[#020817] font-medium"
          >
            <Download size={16} className="mr-2" />
            {loadingDocumentIds.has(doc.id) ? "Baixando..." : "Baixar documento"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
