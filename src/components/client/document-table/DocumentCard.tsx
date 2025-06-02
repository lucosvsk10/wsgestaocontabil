
import { useState } from "react";
import { Document } from "@/utils/auth/types";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Calendar, Eye, EyeOff, Clock } from "lucide-react";

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
        "relative bg-[#1a1f2e] border border-[#2a3441] rounded-xl p-6 transition-all duration-300 hover:border-[#F5C441] hover:shadow-lg hover:shadow-[#F5C441]/10 group cursor-pointer",
        isExpired && "border-red-500/50",
        !doc.viewed && "border-blue-500/50"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Status Badge */}
      <div className="absolute top-4 right-4">
        {!doc.viewed ? (
          <Badge className="bg-blue-600 text-white text-xs px-2 py-1">
            Novo
          </Badge>
        ) : (
          <Badge variant="outline" className="text-green-400 border-green-400 text-xs px-2 py-1">
            Visualizado
          </Badge>
        )}
      </div>

      {/* Document Title */}
      <h3 className="text-white font-semibold text-lg mb-4 pr-16 line-clamp-2">
        {doc.name}
      </h3>

      {/* Document Details */}
      <div className="space-y-3 mb-6 text-sm">
        {/* Date Sent */}
        <div className="flex items-center justify-between text-gray-400">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>Data de envio:</span>
          </div>
          <span className="text-white font-medium">
            {formatDate(doc.uploaded_at)}
          </span>
        </div>

        {/* Validity */}
        <div className="flex items-center justify-between text-gray-400">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Validade:</span>
          </div>
          <span className={cn(
            "font-medium",
            isExpired ? "text-red-400" : expirationText?.includes('dias') ? "text-yellow-400" : "text-green-400"
          )}>
            {expirationText || "Sem expiração"}
          </span>
        </div>

        {/* View Status */}
        <div className="flex items-center justify-between text-gray-400">
          <div className="flex items-center gap-2">
            {doc.viewed ? (
              <Eye className="w-4 h-4 text-green-400" />
            ) : (
              <EyeOff className="w-4 h-4 text-blue-400" />
            )}
            <span>Status:</span>
          </div>
          <span className={cn(
            "font-medium",
            doc.viewed ? "text-green-400" : "text-blue-400"
          )}>
            {doc.viewed ? "Visualizado" : "Não visualizado"}
          </span>
        </div>
      </div>

      {/* Download Button */}
      <Button
        onClick={() => handleDownload(doc)}
        disabled={loadingDocumentIds.has(doc.id)}
        className="w-full bg-[#F5C441] hover:bg-[#F5C441]/90 text-black font-medium py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
      >
        <Download className="w-4 h-4" />
        {loadingDocumentIds.has(doc.id) ? "Baixando..." : "Baixar documento"}
      </Button>

      {/* Hover effect overlay */}
      <div className={cn(
        "absolute inset-0 bg-[#F5C441]/5 rounded-xl transition-opacity duration-300 pointer-events-none",
        isHovered ? "opacity-100" : "opacity-0"
      )} />
    </motion.div>
  );
};
