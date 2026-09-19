import { Download } from "lucide-react";
import { Document } from "@/utils/auth/types";

interface DocumentCardProps {
  doc: Document;
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expiresAt: string | null) => boolean;
  daysUntilExpiration: (expiresAt: string | null) => string | null;
  refreshDocuments: () => void;
  loadingDocumentIds: Set<string>;
  handleDownload: (doc: Document) => Promise<void>;
  categoryColor?: string;
  categories?: Array<{ id: string; name: string; color?: string }>;
}

export const DocumentCard = ({
  doc,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  loadingDocumentIds,
  handleDownload,
  categories = [],
}: DocumentCardProps) => {
  const expired = isDocumentExpired(doc.expires_at);
  const categoryName = categories.find(cat => cat.id === doc.category)?.name || "Documento";
  const isLoading = loadingDocumentIds.has(doc.id);
  const status = expired ? "Expirado" : !doc.viewed ? "Novo" : "Visualizado";

  return (
    <article className={"client-document-row " + (expired ? "is-expired" : !doc.viewed ? "is-new" : "")}>
      <div className="client-document-row-main">
        <span className="client-document-row-marker" />
        <div>
          <strong>{doc.name}</strong>
          {doc.observations && <span>{doc.observations}</span>}
        </div>
      </div>
      <span className="client-document-row-category">{categoryName}</span>
      <time>{formatDate(doc.uploaded_at)}</time>
      <span className={"client-document-row-status " + (expired ? "is-expired" : !doc.viewed ? "is-new" : "is-viewed")}>{status}</span>
      <button
        className="client-document-row-action"
        onClick={() => void handleDownload(doc)}
        disabled={expired || isLoading}
        aria-label={"Baixar " + doc.name}
      >
        <Download className="h-4 w-4" />
        <span>{isLoading ? "Preparando" : expired ? "Indisponível" : "Baixar"}</span>
      </button>
    </article>
  );
};
