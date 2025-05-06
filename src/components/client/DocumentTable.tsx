
import { useState } from "react";
import { Document } from "@/utils/auth/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { MobileDocumentCard, DesktopDocumentTable } from "./document-table";
import { useDocumentActions } from "@/hooks/document/useDocumentActions";

interface DocumentTableProps {
  documents: Document[];
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expiresAt: string | null) => boolean;
  daysUntilExpiration: (expiresAt: string | null) => string | null;
  refreshDocuments: () => void;
}

export const DocumentTable = ({ 
  documents, 
  formatDate, 
  isDocumentExpired, 
  daysUntilExpiration,
  refreshDocuments
}: DocumentTableProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { loadingDocumentIds, setLoadingDocumentIds, handleDownload } = useDocumentActions();

  if (isMobile) {
    return (
      <div className="space-y-4">
        {documents.map(doc => (
          <MobileDocumentCard
            key={doc.id}
            doc={doc}
            formatDate={formatDate}
            isDocumentExpired={isDocumentExpired}
            daysUntilExpiration={daysUntilExpiration}
            refreshDocuments={refreshDocuments}
            loadingDocumentIds={loadingDocumentIds}
            setLoadingDocumentIds={setLoadingDocumentIds}
            handleDownload={handleDownload}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <DesktopDocumentTable
        documents={documents}
        formatDate={formatDate}
        isDocumentExpired={isDocumentExpired}
        daysUntilExpiration={daysUntilExpiration}
        refreshDocuments={refreshDocuments}
        loadingDocumentIds={loadingDocumentIds}
        setLoadingDocumentIds={setLoadingDocumentIds}
        handleDownload={handleDownload}
      />
    </div>
  );
};
