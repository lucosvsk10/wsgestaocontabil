import { Document } from "@/utils/auth/types";
import { DocumentActions } from "./DocumentActions";
import { BellDot, Info } from "lucide-react";

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
    <div className={`p-3 rounded-lg border ${
      isExpired
        ? "bg-red-100/20 dark:bg-red-900/20 border-red-200/30 dark:border-red-900/30" 
        : !doc.viewed
          ? "bg-blue-100/20 dark:bg-blue-900/20 border-blue-200/50 dark:border-blue-700/50"
          : "bg-orange-200/60 dark:bg-navy-light/20 border-gold/20"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium text-navy dark:text-gold flex items-center">
          {!doc.viewed && <BellDot size={16} className="text-blue-500 dark:text-blue-400 mr-2" />}
          {doc.name}
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-gold/80 text-navy dark:bg-gold/70">
          {doc.category}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div className="text-gray-600 dark:text-gray-300">
          Data: <span className="text-navy dark:text-white">{formatDate(doc.uploaded_at)}</span>
        </div>
        <div className="text-gray-600 dark:text-gray-300">
          Validade: 
          <span className={
            isExpired
              ? "text-red-600 dark:text-red-400" 
              : "text-green-600 dark:text-green-400"
          }>
            {" "}{expirationText}
          </span>
        </div>
      </div>
      
      {doc.observations && (
        <div className="mb-3 text-sm">
          <div className="text-gray-600 dark:text-gray-300 flex items-center">
            <Info size={14} className="mr-1" />
            <span>Observações:</span>
          </div>
          <p className="text-navy dark:text-white text-sm ml-5">{doc.observations}</p>
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
