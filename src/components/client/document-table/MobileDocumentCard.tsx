
import { Document } from "@/utils/auth/types";
import { DocumentActions } from "./DocumentActions";
import { BellDot, Info } from "lucide-react";
import { useDocumentNotifications } from "@/hooks/useDocumentNotifications";

interface MobileDocumentCardProps {
  doc: Document;
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expirationDate: string | null) => boolean;
  daysUntilExpiration: (expirationDate: string | null) => string | null;
  refreshDocuments: () => void;
  loadingDocumentIds: Set<string>;
  setLoadingDocumentIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export const MobileDocumentCard = ({
  doc,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  refreshDocuments,
  loadingDocumentIds
}: MobileDocumentCardProps) => {
  // Use our notification hook for checking if document is unread
  const { isDocumentUnread } = useDocumentNotifications(refreshDocuments);
  
  return (
    <div
      key={doc.id}
      className={`p-3 rounded-lg border ${
        isDocumentExpired(doc.expires_at)
          ? "bg-red-900/20 border-red-900/30"
          : "bg-[#46413d] border-gold/20"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium text-white flex items-center">
          {isDocumentUnread(doc.id) && <BellDot size={14} className="text-blue-500 mr-2" />}
          {doc.name || "Sem nome"}
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-[#393532] text-gold">
          {doc.category}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div className="text-gray-300">Data: <span className="text-white">{formatDate(doc.uploaded_at)}</span></div>
        <div className="text-gray-300">
          Validade:
          <span className={isDocumentExpired(doc.expires_at) ? "text-red-400" : "text-green-400"}>
            {" "}{daysUntilExpiration(doc.expires_at)}
          </span>
        </div>
      </div>

      {doc.observations && (
        <div className="mb-3 text-sm">
          <div className="text-blue-400 flex items-center">
            <Info size={14} className="mr-1" />
            <span className="text-gray-300">Observações:</span>
          </div>
          <p className="text-white text-sm ml-5">{doc.observations}</p>
        </div>
      )}

      <DocumentActions
        doc={doc}
        isDocumentExpired={isDocumentExpired}
        refreshDocuments={refreshDocuments}
        loadingDocumentIds={loadingDocumentIds}
      />
    </div>
  );
};
