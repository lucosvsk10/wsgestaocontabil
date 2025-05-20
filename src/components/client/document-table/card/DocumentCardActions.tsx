
import { AppDocument } from "@/types/admin";
import { DocumentActions } from "../DocumentActions";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface DocumentCardActionsProps {
  doc: AppDocument;
  loadingDocumentIds: Set<string>;
  handleDownload: (doc: AppDocument) => Promise<void>;
}

export const DocumentCardActions = ({
  doc,
  loadingDocumentIds,
  handleDownload
}: DocumentCardActionsProps) => {
  const isLoading = loadingDocumentIds.has(doc.id);

  return (
    <div className="mt-4">
      {isLoading ? (
        <div className="flex justify-center">
          <LoadingSpinner size="sm" />
        </div>
      ) : (
        <DocumentActions 
          doc={doc}
          isDocumentExpired={(expiresAt: string | null) => {
            if (!expiresAt) return false;
            const expirationDate = new Date(expiresAt);
            return expirationDate < new Date();
          }}
          handleDownload={handleDownload}
        />
      )}
    </div>
  );
};
