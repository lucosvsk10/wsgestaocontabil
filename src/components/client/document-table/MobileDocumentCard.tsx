
import { Document } from "@/utils/auth/types";
import { DocumentActions } from "./DocumentActions";
import { BellDot, Info, AlertTriangle } from "lucide-react";

interface MobileDocumentCardProps {
  doc: Document;
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expirationDate: string | null) => boolean;
  daysUntilExpiration: (expirationDate: string | null) => string | null;
  refreshDocuments: () => void;
  loadingDocumentIds: Set<string>;
  setLoadingDocumentIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  handleDownload: (doc: Document) => Promise<void>;
}

export const MobileDocumentCard = ({
  doc,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  refreshDocuments,
  loadingDocumentIds,
  setLoadingDocumentIds,
  handleDownload
}: MobileDocumentCardProps) => {
  const isExpired = isDocumentExpired(doc.expires_at);
  const expirationText = daysUntilExpiration(doc.expires_at);
  
  return (
    <div className={`p-3 rounded-lg border transition-all duration-300 ${
      isExpired
        ? "bg-red-100/20 dark:bg-transparent dark:border-red-500/30 border-red-200/30 opacity-60" 
        : !doc.viewed
          ? "bg-blue-100/20 dark:bg-transparent dark:border-blue-500/30 border-blue-200/50"
          : "bg-orange-200/60 dark:bg-transparent dark:border-gold/30"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium text-navy dark:text-gold flex items-center">
          {!doc.viewed && !isExpired && <BellDot size={16} className="text-blue-500 dark:text-blue-400 mr-2" />}
          {isExpired && <AlertTriangle size={16} className="text-red-500 dark:text-red-400 mr-2" />}
          {doc.name}
        </div>
        {!doc.viewed && !isExpired && (
          <span className="text-xs px-2 py-1 rounded-full bg-blue-500/80 text-white dark:bg-transparent dark:border dark:border-blue-500/30 dark:text-blue-400">
            Novo
          </span>
        )}
        {isExpired && (
          <span className="text-xs px-2 py-1 rounded-full bg-red-500/80 text-white dark:bg-transparent dark:border dark:border-red-500/30 dark:text-red-400">
            Expirado
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-1 gap-2 text-sm mb-3">
        <div className="text-gray-600 dark:text-[#d9d9d9]">
          Validade: 
          <span className={
            isExpired
              ? "text-red-600 dark:text-red-400" 
              : "text-green-600 dark:text-green-400"
          }>
            {" "}{isExpired ? "Expirado" : expirationText}
          </span>
        </div>
      </div>
      
      {doc.observations && (
        <div className="mb-3 text-sm">
          <div className="text-gray-600 dark:text-[#d9d9d9] flex items-center">
            <Info size={14} className="mr-1" />
            <span>Observações:</span>
          </div>
          <p className="text-navy dark:text-[#d9d9d9] text-sm ml-5">{doc.observations}</p>
        </div>
      )}
      
      <div className="flex gap-2 mt-2">
        <DocumentActions 
          doc={doc}
          isDocumentExpired={isDocumentExpired}
          refreshDocuments={refreshDocuments}
          loadingDocumentIds={loadingDocumentIds}
          handleDownload={handleDownload}
        />
      </div>
    </div>
  );
};
