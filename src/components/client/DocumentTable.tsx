
import { useState } from "react";
import { Document } from "@/utils/auth/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileDocumentList } from "./document-table/MobileDocumentList";
import { DesktopDocumentList } from "./document-table/DesktopDocumentList";

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
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileDocumentList 
        documents={documents}
        formatDate={formatDate}
        isDocumentExpired={isDocumentExpired}
        daysUntilExpiration={daysUntilExpiration}
        refreshDocuments={refreshDocuments}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <DesktopDocumentList 
        documents={documents}
        formatDate={formatDate}
        isDocumentExpired={isDocumentExpired}
        daysUntilExpiration={daysUntilExpiration}
        refreshDocuments={refreshDocuments}
      />
    </div>
  );
};
