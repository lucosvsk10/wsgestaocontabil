
import { Document } from "@/utils/auth/types";
import { useState } from "react";
import { MobileDocumentCard } from "./MobileDocumentCard";

interface MobileDocumentListProps {
  documents: Document[];
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expirationDate: string | null) => boolean;
  daysUntilExpiration: (expirationDate: string | null) => string | null;
  refreshDocuments: () => void;
}

export const MobileDocumentList = ({
  documents,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  refreshDocuments
}: MobileDocumentListProps) => {
  const [loadingDocumentIds, setLoadingDocumentIds] = useState<Set<string>>(new Set());
  
  return (
    <div className="space-y-4">
      {documents.length > 0 ? (
        documents.map(doc => (
          <MobileDocumentCard 
            key={doc.id}
            doc={doc}
            formatDate={formatDate}
            isDocumentExpired={isDocumentExpired}
            daysUntilExpiration={daysUntilExpiration}
            refreshDocuments={refreshDocuments}
            loadingDocumentIds={loadingDocumentIds}
            setLoadingDocumentIds={setLoadingDocumentIds}
          />
        ))
      ) : (
        <div className="text-center py-4 text-gray-400 bg-[#393532] rounded-lg border border-gold/20 p-4">
          Não há documentos disponíveis
        </div>
      )}
    </div>
  );
};
